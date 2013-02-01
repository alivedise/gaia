'use strict';

var MockMozActivity = function MockMozActivity(configuration) {
	for (var property in configuration) {
		this[property] = configuration[property];
	}
	return this;
};