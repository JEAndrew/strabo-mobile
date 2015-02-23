/*jshint node:true*/
"use strict";

module.exports = function(grunt) {
	grunt.initConfig({
		php: {
			server: {
				options: {
					port: 8080
				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-php');
	grunt.registerTask('server', ['php:server:keepalive']);
	grunt.registerTask('default', ['php:server:keepalive']);
};
