module.exports = function(grunt) {
    grunt.initConfig({
        project: {
            pages: ['index.html', 'vehicle_details.html'],
        },
        jshint: {
            files: ['Gruntfile.js', 'app/js/**/*.js'],
            options: {
                globals: {
                    jQuery: true,
                    window: true,
                    angular: true,
                    google: true,
                    io: true,
                    _: true,
                    MarkerWithLabel: true,
                    document: true
                },
                eqnull: true,
                ignores: ['app/js/app.js'],
            }
        },
        concat: {
            options: {
                separator: ';'
            },
            app: {
                // force index.js to precede others to allow module definitions
                // to occur first
                src: ['app/js/app/**/index.js', 'app/js/app/**/*.js'],
                dest: 'app/js/app.js',
                options: {
                    banner: '(function(){"use strict";',
                        footer: '})();',
                        sourceMap: true,
                },
            }
        },
        ngAnnotate: {
            options: {
            },
            app: {
                files:[
                    {
                        src: ['app/js/app.js'],
                        dest: '.tmp/ngAnnotate/app.js',
                    }
                ]
            }
        },
        uglify: {
            app: {
                files: {
                    'dist/js/app.min.js': ['.tmp/ngAnnotate/app.js', '.tmp/ngtemplates/templates.js'],
                },
            },
            main: {
                files: {
                    'dist/js/markerwithlabel.min.js': 'bower_components/google-maps-utility-library-v3/markerwithlabel/src/markerwithlabel.js'
                }
            }
        },
        copy: {
            main: {
                files: [
                    {
                        expand: true,
                        cwd: 'app',
                        src: ['**/imgs/*'],
                        dest: 'dist/',
                    },
                    {
                        src: 'bower_components/angular/angular-csp.css',
                        dest: 'dist/css/angular-csp.css',
                    }
                ]
            },
            bootstrap_fonts: {
                files: [
                    {
                        expand: true,
                        cwd: 'bower_components/bootstrap/dist',
                        src: 'fonts/*',
                        dest: 'dist',
                    },
                ],
            },
        },
        processhtml: {
            options: {
                commentMarker: 'process',
            },
            main: {
                files: [
                    {
                        expand: true,
                        cwd: 'app',
                        src: ['<%= project.pages %>'],
                        dest: 'dist/',
                    },
                ],
            },
        },
        useminPrepare: {
            html: {
                expand: true,
                cwd: 'app',
                src: ['<%= project.pages %>'],
            },
            options: {
                dest: 'dist',
            }
        },
        usemin: {
            html: {
                expand: true,
                cwd: 'dist',
                src: ['<%= project.pages %>'],
            }
        },
        clean: ['.tmp', 'dist', 'app/js/app.js*'],
        jade: {
            compile: {
                options: {
                    pretty: true,
                },
                files: [
                    {
                        expand: true,
                        cwd: 'app',
                        src: ['*.jade', 'pages/*.jade'],
                        ext: '.html',
                        dest: 'app',
                    },
                ]
            }
        },
        watch: {
            default: {
                files: ['app/**/*.jade', 'app/**/*.js', 'app/**/*.css', 'app/**/*.less', 'app/imgs/**', '!app/js/app.js'],
                tasks: 'dev',
                options: {
                    livereload: true,
                },
            },
        },
        less: {
            bootstrap: {
                options: {
                    strictMath: true,
                    // Add plugin for prefixing
                },
                src: 'app/css/bootstrap/less/bootstrap.less',
                dest: 'app/css/bootstrap.css',
            }
        },
        ngtemplates: {
            sbfModuleTemplates: {
                cwd: 'app',
                src: 'pages/*.html',
                dest: '.tmp/ngtemplates/templates.js',
            }
        },
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-ng-annotate');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-processhtml');
    grunt.loadNpmTasks('grunt-usemin');
    grunt.loadNpmTasks('grunt-newer');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-jade');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-angular-templates');
    grunt.registerTask('dev', ['jshint', 'jade', 'less', 'concat:app']);
    grunt.registerTask('default', ['dev', 'ngtemplates', 'useminPrepare', 'processhtml', 'newer:concat', 'newer:ngAnnotate', 'newer:uglify', 'newer:cssmin', 'usemin', 'copy']);
};
