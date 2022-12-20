import { locationCleanup } from './utils/string.mjs';
import { elemForEach } from './utils/elem.mjs';
import getCurrentWeather from './currentweather.mjs';
import getHazards from './hazards.mjs';
import { currentDisplay } from './navigation.mjs';

// constants
const degree = String.fromCharCode(176);

// local variables
let screenIndex = 0;

// start drawing conditions
// reset starts from the first item in the text scroll list
const start = () => {
	// store see if the context is new

	// draw the data
	drawScreen();
};

const stop = (reset) => {
	if (reset) screenIndex = 0;
};

// increment interval, roll over
const incrementInterval = () => {
	// test current screen
	const display = currentDisplay();
	if (!display?.okToDrawCurrentConditions) {
		stop(display?.elemId === 'progress');
		return;
	}
	screenIndex = (screenIndex + 1) % (screens.length);
	// draw new text
	drawScreen();
};

const drawScreen = async () => {
	// get the conditions
	const data = await getCurrentWeather(() => this.stillWaiting());
	const hazards = await getHazards(() => this.stillWaiting());

	// combine data
	data.hazards = hazards;

	// nothing to do if there's no data yet
	if (!data) return;

	const toDraw = screens[screenIndex](data, incrementInterval);

	// nothing to draw (typically hazards)
	if (toDraw === false) {
		// call the next item now
		incrementInterval();
	}

	// normal 1-page condition
	if (typeof toDraw === 'string') {
		elemForEach('.weather-display .scroll .fixed', (elem) => {
			elem.style.display = 'block';
		});
		elemForEach('.weather-display .scroll .scroll', (elem) => {
			elem.style.display = 'none';
		});
		drawCondition(toDraw);
		setTimeout(incrementInterval, 4000);
	} else {
		// scrolling
		elemForEach('.weather-display .scroll .fixed', (elem) => {
			elem.style.display = 'none';
		});
		elemForEach('.weather-display .scroll .scroll-text', (elem) => {
			elem.style.display = 'block';
		});
		drawCondition(toDraw.text, 'scrolling');
	}
};

const hazards = (data, done) => {
	// test for data
	if (!data.hazards || data.hazards.length === 0) return false;

	const hazard = `${data.hazards[0].properties.event} ${data.hazards[0].properties.description}`;

	setTimeout(() => done(), 1000);

	return {
		text: hazard,
	};
};

// the "screens" are stored in an array for easy addition and removal
const screens = [
	// hazards
	hazards,
	// station name
	(data) => `Conditions at ${locationCleanup(data.station.properties.name).substr(0, 20)}`,

	// temperature
	(data) => {
		let text = `Temp: ${data.Temperature}${degree}${data.TemperatureUnit}`;
		if (data.observations.heatIndex.value) {
			text += `    Heat Index: ${data.HeatIndex}${degree}${data.TemperatureUnit}`;
		} else if (data.observations.windChill.value) {
			text += `    Wind Chill: ${data.WindChill}${degree}${data.TemperatureUnit}`;
		}
		return text;
	},

	// humidity
	(data) => `Humidity: ${data.Humidity}%   Dewpoint: ${data.DewPoint}${degree}${data.TemperatureUnit}`,

	// barometric pressure
	(data) => `Barometric Pressure: ${data.Pressure} ${data.PressureDirection}`,

	// wind
	(data) => {
		let text = '';
		if (data.WindSpeed > 0) {
			text = `Wind: ${data.WindDirection} ${data.WindSpeed} ${data.WindUnit}`;
		} else {
			text = 'Wind: Calm';
		}
		if (data.WindGust > 0) {
			text += `  Gusts to ${data.WindGust}`;
		}
		return text;
	},

	// visibility
	(data) => `Visib: ${data.Visibility} ${data.VisibilityUnit}  Ceiling: ${data.Ceiling === 0 ? 'Unlimited' : `${data.Ceiling} ${data.CeilingUnit}`}`,
];

// internal draw function with preset parameters
const drawCondition = (text, selector = 'fixed') => {
	// update all html scroll elements
	elemForEach(`.weather-display .scroll .${selector}`, (elem) => {
		elem.innerHTML = text;
	});
};

document.addEventListener('DOMContentLoaded', () => {
	start();
});
