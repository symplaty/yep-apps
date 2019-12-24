// Json file url
var jsonUrl = "./webapps/apps.json";
// To store app list read from json file
var appList = [];
// DOM elements
var content = document.getElementById("content");
var appsGrid = document.getElementById("apps-grid");

// Read json file
function readJSON(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.onload = function () {
        callback(xhr.responseText);
    }
    xhr.open("GET", url);
    xhr.send(null);
}
function readJsonCallback(json) {
    var jsonObj = JSON.parse(json);
    for (prop in jsonObj) {
        var app = jsonObj[prop];
        appList.push(app);
    }
    createAppElements();
}

readJSON(jsonUrl, readJsonCallback);

// Create app elements according to appList
function createAppElements() {
    appList.forEach(function (app) {
        var appWrapper = document.createElement("div");
        appWrapper.classList.add("app-wrapper");
        var a = document.createElement("a");
        a.title = app["title"];
        a.href = app["href"];
        a.target = "_blank";
        var appIcon = document.createElement("div");
        appIcon.classList.add("app-icon");
        var img = document.createElement("img");
        var r = /\/[^\/]*$/;
        var imgSrc = app["href"].replace(r, "/favicon.ico");
        console.log(imgSrc);
        
        img.src = imgSrc;
        appIcon.appendChild(img);
        var appTitle = document.createElement("div");
        appTitle.classList.add("app-title");
        appTitle.title = app["title"];
        var span = document.createElement("span");
        span.innerText = app["title"];
        appTitle.appendChild(span);
        a.appendChild(appIcon);
        a.appendChild(appTitle);
        appWrapper.appendChild(a);
        appsGrid.appendChild(appWrapper);
    });
}