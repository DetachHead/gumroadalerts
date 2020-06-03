import puppeteer from 'puppeteer';
import fs from 'fs';
import axios from 'axios';

import config from './config.json';

const notifsUrl = config.webhooks.notifs;
const errorsUrl = config.webhooks.errors;

type gumroad = {
	name: string,
	link: string,
	linkid: string,
	email: string
};

//main
(async () => {
	await Promise.all(config.gumroads.map((gumroad) => checkGumroad(gumroad)))
})();

//returns an array of existing file names from the specified saved json. creates an empty one and returns an empty array if it doesnt exist
function getExistingFilesArray(jsonpath: string): string[] {
	if (fs.existsSync(jsonpath))
		return JSON.parse(fs.readFileSync(jsonpath).toString())
	fs.writeFileSync(jsonpath, "[]")
	return []
}

//checks a specified gumroad for new content and messages the discord if new content is found
async function checkGumroad(gumroad: gumroad) {
	console.log(`checking gumroad for ${gumroad.name}`);
	const filepath = `${__dirname}/${gumroad.name}_files.json`
	const files = getExistingFilesArray(filepath)
	const newFiles: string[] = [];

	//open browser:
	const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
	const page = await browser.newPage();
	await page.setRequestInterception(true);

	//dont load useless shit:
	page.on('request', (request) => {
		if (['image', 'stylesheet', 'font'].indexOf(request.resourceType()) !== -1) {
			request.abort();
		} else {
			request.continue();
		}
	});

	//get to the content list:
	await page.goto(`https://gumroad.com/d/${gumroad.linkid}`);
	const filenameXpath = '//div[@class="file-row-content-component__info"]/h4'
	if ((await page.$x(filenameXpath)).length === 0) { //some gumroads make u enter ur email
		await page.type('input#email', gumroad.email);
		await Promise.all([
			page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
			page.click('button.button.button-primary')
		])
	}

	//get the titles of each upload:
	for (const element of (await page.$x(filenameXpath))) {
		newFiles.push(await page.evaluate(el => el.innerText, element));
	}

	await browser.close();

	//compare the current list to the previously saved list & msg the discord webhook if theres a difference:
	if (newFiles.length > 0) {
		let diff = newFiles.length - files.length;
		let diffFiles = [];
		let msgText = "";
		if (diff > 0) {
			diffFiles = newFiles.filter(file => files.indexOf(file) < 0);
			msgText = `New ${gumroad.name} upload(s)`
		} else if (diff < 0) {
			diffFiles = files.filter(file => newFiles.indexOf(file) < 0);
			msgText = `${gumroad.name} upload(s) deleted`
		} else {
			for (let i in files) {
				if (files[i] != newFiles[i]) {
					diffFiles.push(newFiles[i]);
					msgText = `${gumroad.name} uploads changed (either renamed or deleted & uploaded at the same time)`;
				}
			}
		}

		//create and send the msg(s) if there were any changes:
		if (diffFiles.length > 0) {
			//split msg up in case its above discords character limit (TODO: less fucked method...):
			const msgs: string[] = [`${msgText} - at ${gumroad.link}\n\`\`\``]
			for (const file of diffFiles) {
				const appendedText = `\n${file}`
				if (msgs[msgs.length - 1].length > (2000 - appendedText.length))
					msgs.push("")
				msgs[msgs.length - 1] += appendedText
			}
			if (msgs[msgs.length - 1].length <= 2000 - 3)
				msgs[msgs.length - 1] += "```"

			//send msg(s):
			for (const msg of msgs) {
				await axios.post(notifsUrl, { username: "gumroad checker", content: msg }).catch(async err => {
					console.log(err)
					await error("failed to send msg")
				});
			}

			//write the new files to the files json:
			fs.writeFile(filepath, JSON.stringify(newFiles), async err => {
				console.log(err)
				await error("failed to write to the files json")
			});
		}
	} else {
		await error("failed to find any files")
	}
	console.log(`finished checking gumroad for ${gumroad.name}`);
}

async function error(text: string) {
	await axios.post(errorsUrl, { username: "gumroad checker", content: text }).catch(err => {
		console.log(err)
	});
}