const gulp = require('gulp');
const mediaQueriesSplitter = require('gulp-media-queries-splitter');
const sass = require('gulp-sass')(require('sass'));
const cleanCSS = require('gulp-clean-css');
const through = require('through2')

exports.build = function build() {
    return gulp.src('./_sass/**/site.scss')
        .pipe(sass({outputStyle: 'compressed'}).on('error', sass.logError))
        .pipe(through.obj((chunk, enc, cb) => {
            const regex = /url\(('|")data:image\/svg\+xml,(.*?)\1\)/gm;
            const contents = chunk.contents.toString();
            const replacePairs = [];
            let m;
            while ((m = regex.exec(contents)) !== null) {
                // This is necessary to avoid infinite loops with zero-width matches
                if (m.index === regex.lastIndex) {
                    regex.lastIndex++;
                }
                const svg = btoa(decodeURIComponent(m[2]));
                const replacement = m[0].replace(m[2], svg).replace('svg+xml,', 'svg+xml;base64,');
                replacePairs.push([m[0], replacement])
            }

            chunk.contents = Buffer.from(replacePairs.reduce((contents, [source, replacement]) => {
                return contents.replace(source, replacement)
            }, contents));

            cb(null, chunk)
        }))
        .pipe(mediaQueriesSplitter([
            {media: 'all', filename: 'site.css'},
            {media: 'all', filename: 'amp.css'},
        ]))
        .pipe(through.obj((chunk, enc, cb) => {
            if (chunk.history.indexOf('amp.css') > -1) {
                const regex = /\s*!important/gm;
                const contents = chunk.contents.toString();
                chunk.contents = Buffer.from(contents.replace(regex, ''));
            }

            cb(null, chunk)
        }))
        // .pipe(cleanCSS())
        .pipe(gulp.dest('./assets/css'));
}

exports.watch = gulp.series(exports.build, function watch() {
    gulp.watch('./_sass/**/*.scss', exports.build)
});