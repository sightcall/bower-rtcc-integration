module.exports = function(grunt) {
  'use strict'

  grunt.initConfig({
    jshint: {
      files: ['Gruntfile.js', 'src/**/*.js', 'test/**/*.js'],
      options: {
        jshintrc: '.jshintrc'
      }
    },

    watch: {
      files: ['<%= jshint.files %>', 'assets/**/*'],
      tasks: ['less:development', 'concat']
    },

    less: {
      development: {
        files: {
          "dist/css/main.css": "assets/css/main.less"
        }
      },
      production: {
        options: {
          plugins: [
            new(require('less-plugin-autoprefix'))({
              browsers: ["last 2 versions"]
            }),
            new(require('less-plugin-clean-css'))({})
          ],
        },
        files: {
          "dist/css/main.css": "assets/css/main.less"
        }
      }
    },

    concat: {
      options: {
        separator: ';',
      },
      dist: {
        src: [
          'src/rtccint.js',
          'src/RtccInt/**',
        ],
        dest: 'dist/rtccint.js',
      },
    },

  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-concat');

  grunt.registerTask('default', ['watch']);
  grunt.registerTask('build', ['less:development', 'concat']);

};