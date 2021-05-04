# gumroadalerts

checks a gumroad page for new uploads & calls a webhook when theres changes

## config
make an [app-config](https://app-config.dev/guide/intro/config-loading.html) file with config matching [`.app-config.schema.yml`](/.app-config.schema.yml)

## how to run
- run `npm run build`, then set `node dist/main.js` to run on a cron job or something
- alternatively, this project is set up to run on an aws lambda using [serverless](https://www.serverless.com/). you could maybe fork this repo and run your own instance

i intend to make a site where users can subscribe to gumroads so you don't have to set up your own instance
