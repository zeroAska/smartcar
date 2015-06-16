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
            }
        },
        ngAnnotate: {
            options: {
            },
            app: {
                files: [
                    {
                        expand: true,
                        src: ['app/js/**/*.js'],
                        dest: '.tmp/ngAnnotate/app',
                    },
                ]
            }
        },
        concat: {
            app: {
                src: ['.tmp/ngAnnotate/app/**/*.js'],
                dest: 'dist/js/app.js',
            }
        },
        uglify: {
            app: {
                files: {
                    'dist/js/app.min.js': ['dist/js/app.js'],
                },
            }
        },
        copy: {
            main: {
                files: [
                    {
                        expand: true,
                        cwd: 'app',
                        src: ['**/*.html', '**/css/*', '**/imgs/*'],
                        dest: 'dist/',
                    }
                ]
            }
        },
        clean: ['.tmp', 'dist'],
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-ng-annotate');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.registerTask('default', ['jshint', 'ngAnnotate', 'concat', 'uglify', 'copy']);
};
