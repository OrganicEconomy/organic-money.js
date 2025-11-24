const path = require('path');

module.exports = {
	mode: 'production',
	entry: './src/index.js',
	devtool: 'inline-source-map',
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: 'organic-money.js',
		library: "organicMoney",
	},
	resolve: {
		fallback: {
			"buffer": false
		}
	}
}
