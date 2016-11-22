var fs = require('fs');
var rmrf = require('rimraf');
var yaml = require('js-yaml');
var marked = require('marked');
var mark = require('markup-js');

// generate a Ning site.
exports.generate = function() {
    if (exists(outputDir)) {
        rmrf.sync(outputDir);
    }
    copyPagesInDir('./');
    copyRawFilesInDir('./');
}

// site output dir.
const outputDir = '_site';

function getLayout(layoutName) {
    if (layoutName.indexOf('.') == -1) {
        layoutName += '.html';
    }
    var contents = fs.readFileSync('_layouts/' + layoutName, 'utf8');
    return contents;
}

function copyPagesInDir(rootDir) {
    fs.readdirSync(rootDir).forEach(function (fileName) {
        if (fileName.startsWith('_') || fileName.startsWith('.')) {
            return;
        }
        var file = rootDir + fileName;
        if (fs.statSync(file).isDirectory()) {
            copyPagesInDir(file + '/');
        } else {
            var isPage = fileName.endsWith('.md') || fileName.endsWith('.markdown') || fileName.endsWith('.mark') || fileName.endsWith('.link');
            if (!isPage) {
                return;
            }

            var out = outputDir + '/' + file;
            out = './' + out.replace('./', '');
            out = out.replace('.md', '.html');
            out = out.replace('.markdown', '.html');
            out = out.replace('.mark', '.html');
            out = out.replace('.link', '.html');

            checkDir(out);
            var contents = loadMarkdownContents(fs.readFileSync(file, 'utf8'));
            var page = contents.frontMatter || {};
            var template = getLayout(page.layout || 'page.html');
            var context = contents;
            var html = mark.up(template, context);
            fs.writeFileSync(out, html, 'utf8');
        }
    });
}

function loadMarkdownContents(contents) {
    if (contents.startsWith('---\n')) {
        var end = contents.search(/\n---\n/);
        if (end != -1) {
            return {
                page: yaml.load(contents.slice(4, end + 1)) || {},
                content: marked(contents.slice(end + 5))
            }
        }
    }
    return { frontMatter: null, mainText: marked(contents) };
}

// copy raw files.
// copy files that not *.md, *.markdown, *.link, *mark without parse.
function copyRawFilesInDir(rootDir) {
    var readDir = fs.readdirSync(rootDir);
    
    fs.readdirSync(rootDir).forEach(function (fileName) {
        if (fileName.startsWith('_') || fileName.startsWith('.')) {
            return;
        }
        if (fileName.endsWith('.markdown') || fileName.endsWith('.md') || fileName.endsWith('.link')) {
            return;
        }
        var file = rootDir + fileName;
        if (fs.statSync(file).isDirectory()) {
            copyRawFilesInDir(file + '/');
        } else {
            var out = outputDir + '/' + file;
            out = './' + out.replace('./', '');
            checkDir(out);
            var content = fs.readFileSync(file, "utf8");
            fs.writeFileSync(out, content, "utf8");
        }
    });
}

// check dir exists, if not exists, create one.
function checkDir(fullPath) {
    var parts = fullPath.split('/');
    parts.length -= 1;
    var cur = '';
    parts.forEach(function (part) {
        cur += part + '/';
        if (!exists(cur, true)) {
            fs.mkdirSync(cur);
        }
    });
}

// if a file or dir exists.
function exists(file, isDir) {
    try {
        return fs.statSync(file)[isDir ? 'isDirectory' : 'isFile']();
    } catch (e) {
        return false;
    }
}
