module.exports = function(grunt) {
  'use strict'

  var jsFiles = ['Gruntfile.js', 'src/**/*.js', 'spec/**/*.js']

  grunt.initConfig({

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


    githooks: {
      all: {
        'pre-commit': 'precommit'
      }
    },

    jshint: {
      files: jsFiles,
      options: {
        jshintrc: '.jshintrc'
      }
    },

    jsbeautifier: {
      "default": {
        src: jsFiles,
        options: {
          config: ".jsbeautifyrc"
        }
      },
      "git-pre-commit": {
        src: jsFiles,
        options: {
          mode: "VERIFY_ONLY",
          config: ".jsbeautifyrc"
        }
      }
    },

    jasmine: {
      unit: {
        src: 'dist/rtccint.js',
        options: {

          keepRunner: true,
          outfile: 'spec/unit/unit.html',
          specs: ["spec/unit/*_spec.js"],
          vendor: ['bower_components/jquery/dist/jquery.js']
        }
      }
    },

    jsdoc: {
      dist: {
        src: jsFiles,
        options: {
          destination: 'doc'
        }
      }
    }


  });

  //auto load all tasks
  require('load-grunt-tasks')(grunt);

  grunt.registerTask('default', ['watch']);
  grunt.registerTask('prepare', ['jshint', 'jsbeautifier:default']);
  grunt.registerTask('precommit', ['jshint', 'jsbeautifier:git-pre-commit']);
  grunt.registerTask('build', ['less:development', 'concat']);

};
