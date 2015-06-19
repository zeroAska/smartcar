module.exports = function(grunt) {
    grunt.initConfig({
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
                src: ['app/js/app/**/*.js'],
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
                    'dist/js/app.min.js': '.tmp/ngAnnotate/app.js',
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
                        src: ['**/css/*', '**/imgs/*'],
                        dest: 'dist/',
                    }
                ]
            }
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
                        src: ['index.html'],
                        dest: 'dist/',
                    },
                ],
            },
        },
        useminPrepare: {
            html: 'app/index.html',
            options: {
                dest: 'dist',
            }
        },
        usemin: {
            html: ['dist/index.html']
        },
        clean: ['.tmp', 'dist'],
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
    grunt.registerTask('default', ['jshint', 'useminPrepare', 'processhtml', 'newer:concat', 'ngAnnotate', 'newer:uglify', 'usemin', 'copy']);
};
