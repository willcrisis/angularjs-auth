var gulp = require('gulp');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var pump = require('pump');

gulp.task('compress', function (cb) {
    pump([
            gulp.src('auth.js'),
            gulp.dest('dist'),
            uglify(),
            rename('auth.min.js'),
            gulp.dest('dist')
        ],
        cb
    );
});

gulp.task('default', ['compress']);