const Telegraf = require('telegraf');
const app = new Telegraf(process.env.BOT_TOKEN);
const fs = require('fs');
const CronJob = require('cron').CronJob;
const request = require('request');

Date.prototype.getWeek = function() {
	const onejan = new Date(this.getFullYear(), 0, 1);
	return Math.ceil((((this - onejan) / 86400000) + onejan.getDay() + 1) / 7);
};

app.telegram.getMe().then((botInfo) => {
	app.options.username = botInfo.username;
	console.log("Initialized", botInfo.username);
});

if(!fs.existsSync('users.json')) {
	fs.writeFileSync('users.json', '{}');
}
let users = JSON.parse(fs.readFileSync('users.json'));

app.command('start', ctx => {
	console.log('start', ctx.chat);
	users[ctx.chat.id] = ctx.chat;
	fs.writeFileSync('users.json', JSON.stringify(users));
	ctx.reply('Guten Tag. Ich werde dir jeden Tag das aktuelle Menü des Stiftsberg Restaurants senden.');
});

app.command('stop', ctx => {
	console.log('stop', ctx.chat);
	delete users[ctx.chat.id];
	fs.writeFileSync('users.json', JSON.stringify(users));
	ctx.reply('Du bekommst nun keine täglichen Updates mehr. Um sie wieder zu abbonieren, schreibe /start');
});

app.startPolling();

function sendPlan() {
	const date = new Date();
	const year = date.getFullYear();
	const kw = date.getWeek();
	console.log('Requesting for', year, kw);
	request(`https://sdl-app-stiftsberg.lidl.com/app_stiftsberg/speiseplan/menu_${year}_${kw}.json`, (err, request, body) => {
		if(err) throw err;
		console.log(typeof body);
		let menu = JSON.parse(body.trim());
		console.log(menu);
		const menuPlan = formatPlan(menu);
		for(let user in users) {
			if(!users.hasOwnProperty(user)) {
				continue;
			}
			app.telegram.sendMessage(user, menuPlan, {parse_mode: 'Markdown'});
		}
	});
}

function formatPlan(menu) {
	const today = new Date();

	let content = '';
	menu.category.forEach(elem => {
		content += `\n*${elem.title}*\n`;
		const todayDishes = elem.days.find(day => day.date === today.toISOString().substr(0, today.toISOString().indexOf('T')));
		todayDishes.dishes.forEach(dish => {
			const title = dish.title.replace(/ \(([A-Z0-9],?)+\)/g, '');
			content += `${dish.price}€    ${title}\n`;
		});
	});

	console.log(content);
	return content;
}

new CronJob('00 30 11 * * 1-5', sendPlan).start();
