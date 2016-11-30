var fs = require('fs');
var rmrf = require('rimraf');
var yaml = require('js-yaml');
var marked = require('marked');
var mustache = require('mustache');

// generate a Ning site.
// 生成站点
exports.generate = function() {
    if (exists(outputDir)) {
        rmrf.sync(outputDir);
    }
    copyPagesInDir('./');
    copyRawFilesInDir('./');
}

// site output dir.
// 站点输出目录
const outputDir = '_site';

// render markdown formate pages to html files
// 渲染 markdown 文件
function copyPagesInDir(rootDir) {
    var siteConfigFile = './_config.yaml';
    var templateConfigFile = './_layout/_config.yaml';
    var view = {
        site: loadSiteVars(siteConfigFile),
        template: loadTemplateVars(templateConfigFile),
        page: {},
        ning: loadNingVars()
    };
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

            var lastIndex = file.lastIndexOf('.');
            var fileName = file.substr(0, lastIndex);
            var pageOutPath = outputDir + '/' + fileName + '.html';
            pageOutPath = './' + pageOutPath.replace('./', '');

            checkDir(pageOutPath);

            // page vars
            var pageFile = file;
            view.page = loadPageVars(pageFile);

            // template
            var templateContent = '';
            if (view.page.layout) {
                templateContent = loadTemplateContent('_layout/' + view.page.layout + '.html');
            }
            if (templateContent === '') {
                templateContent = loadDefaultTemplateContent();
            }

            // render & write file
            var html = mustache.render(templateContent, view);
            fs.writeFileSync(pageOutPath, html, 'utf8');
        }
    });
}

// get layout file's content
// 获取模版文件的内容
function loadTemplateContent(file) {
    if (!exists(file, false)) {
        return '';
    }
    var contents = fs.readFileSync(file, 'utf8');
    return contents;
}

function loadDefaultTemplateContent() {
    var file = '_layout/default.html';
    var content = loadTemplateContent(file);
    return content;
}

function loadNingVars() {
    var ning = {
        'name': 'Ning',
        'version': '2.0.0',
        'author': 'Richard Libre',
        'text': 'Powered by <a href="http://github.com/codinggirl/ning/">Ning</a>.'
    };
    return ning;
}

function loadSiteVars(file) {
    var site = {};
    if (exists(file, false)) {
        var content = fs.readFileSync(file, 'utf8');
        site = yaml.load(content) || {};
    }
    return site;
}

function loadTemplateVars(file) {
    var template = {};
    if (exists(file, false)) {
        var content = fs.readFileSync(file, 'utf8');
        template = yaml.load(content) || {};
    }
    return template;
}

// get markdown page's content, and convert to json object
// 获取 markdown 内容，并设置 page 变量
function loadPageVars(file) {
    var page = {};
    var contents = fs.readFileSync(file, 'utf8');
    if (contents.startsWith('---\n')) {
        var end = contents.search(/\n---\n/);
        if (end != -1) {
            page = yaml.load(contents.slice(4, end + 1)) || {};
            page.content = marked(contents.slice(end + 5));
        }
    } else {
        page.content = marked(contents)
    }
    return page;
}

// copy raw files.
// copy files that not *.md, *.markdown, *.link, *mark without parse.
function copyRawFilesInDir(rootDir) {
    fs.readdirSync(rootDir).forEach(function (fileName) {
        if (fileName.startsWith('_') || fileName.startsWith('.')) {
            return;
        }
        if (fileName.endsWith('.mark') || fileName.endsWith('.markdown') || fileName.endsWith('.md') || fileName.endsWith('.link')) {
            return;
        }
        var file = rootDir + fileName;
        if (fs.statSync(file).isDirectory()) {
            copyRawFilesInDir(file + '/');
        } else {
            var out = outputDir + '/' + file;
            out = './' + out.replace('./', '');
            checkDir(out);
            var content = fs.readFileSync(file);
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
