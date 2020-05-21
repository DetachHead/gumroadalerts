// need a deets.json

const puppeteer = require('puppeteer');
const fs = require('fs')
const axios = require('axios');

const files = require('./files.json');
const deets = require('./deets.json');
let newFiles = [];

let notifsUrl = deets.webhooks.notifs;
let errorsUrl = deets.webhooks.errors;

(async () => {
    const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox']})
    const page = await browser.newPage();
	await page.setRequestInterception(true);
	page.on('request', (request) => {
		if (['image', 'stylesheet', 'font'].indexOf(request.resourceType()) !== -1) {
			request.abort();
		} else {
			request.continue();
		}
	});
    await page.goto(`https://gumroad.com/d/${deets.linkid}`);
    await page.type('input#email', deets.email);
	await Promise.all([
		page.waitForNavigation({waitUntil: 'domcontentloaded'}),
		page.click('button.button.button-primary'),
	]);
	const xpath = '//div[@class="file-row-content-component__info"]/h4'
	for (const element of (await page.$x(xpath))) {
		newFiles.push(await page.evaluate(el => el.innerText, element));
	}
	await browser.close();

	if (newFiles.length > 0) {
		let diff = newFiles.length - files.length;
		let diffFiles = [];
		let msgText = "";
		if (diff > 0) {		
			diffFiles = newFiles.filter(file => files.indexOf(file) < 0);
			msgText = `<@&${deets.tagrole}> New MDE upload(s)`
		} else if (diff < 0) {
			diffFiles = files.filter(file => newFiles.indexOf(file) < 0);
			msgText = "MDE upload(s) deleted"
		} else {
			for (let i in files) {
				if (files[i] != newFiles[i]) {
					diffFiles.push(newFiles[i]);
					msgText = `<@&${deets.tagrole}> MDE uploads changed (either renamed or deleted & uploaded at the same time)`;
				}
			}
		}
		if (diffFiles.length > 0) {
			msgText = msgText + ":\n```"+diffFiles.join("\n")+"```\n at http://gum.co/hydewars"
			await axios.post(notifsUrl, {username: "Old Greg",content: msgText}).catch(err => {
				console.log(err)
			});
			fs.writeFile(__dirname + '/files.json', JSON.stringify(newFiles), err => {
				console.log(err)
			});
		}
	} else {
		await axios.post(errorsUrl, {username: "nigga webhook",content: "gumroad checker failed to find any files"}).catch(err => {
			console.log(err)
		});
	}
	console.log('done');
})();