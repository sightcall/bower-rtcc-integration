module.exports = function(grunt) {
  'use strict'

  var jsFiles = ['Gruntfile.js', 'src/**/*.js', 'spec/**/*.js']
  var testDeps = [
    'bower_components/jquery/dist/jquery.js',
    'bower_components/css-element-queries/src/ResizeSensor.js',
    'spec/support/*.js'
  ]


  grunt.initConfig({

    config: grunt.file.readJSON('config.json'),
    watch: {
      files: ['<%= jshint.files %>', 'assets/**/*'],
      tasks: ['build', 'sftp']
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
          'bower_components/jquery/dist/jquery.js',
          'bower_components/css-element-queries/src/ResizeSensor.js',
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
      files: ['src/**/*.js'],
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
          vendor: testDeps
        }
      },
      acceptance: {
        src: 'dist/rtccint.js',
        options: {
          keepRunner: true,
          outfile: 'spec/acceptance/acceptance.html',
          specs: ["spec/acceptance/*_spec.js"],
          vendor: testDeps
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
    },

    copy: {
      main: {
        files: [
          {
            expand: true,
            cwd: 'assets/',
            src: ['**', '!css/**/*.less'],
            dest: 'dist/'
          },
        ]
      }
    },

    sftp: {
      test: {
        files: {
          "./": "dist/**"
        },
        options: {
          srcBasePath: "dist/",
          createDirectories: true,
          path: '<%= config.path %>',
          host: '<%= config.host %>',
          username: '<%= config.username %>',
          password: '<%= config.password %>',
          showProgress: true
        }
      }
    },

    bump: {
      options: {
        files: ['bower.json'],
        updateConfigs: [],
        commit: true,
        commitFiles: ['bower.json'], // '-a' for all files
        createTag: true,
        tagName: '%VERSION%',
        tagMessage: 'Version %VERSION%',
        push: true,
        pushTo: 'origin',
        gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d' // options to use with '$ git describe'
      }
    },


  });

  //auto load all tasks
  require('load-grunt-tasks')(grunt);

  grunt.registerTask('default', ['watch']);
  grunt.registerTask('prepare', ['jshint', 'jsbeautifier:default', 'jasmine']);
  grunt.registerTask('precommit', ['jshint', 'jsbeautifier:git-pre-commit', 'jasmine']);
  grunt.registerTask('build', ['less:development', 'concat', 'copy']);

};
