
var beautify = ace.require("ace/ext/beautify");

// id的流水号，分editor、iframe以及editor与iframe成组3套流水号
var editorSeq = 0;
var iframeSeq = 0;
var groupSeq = 0;
var content = $("#content");
// editor数组，分为单独创建的editor和与iframe成对创建的editor
var editors = [];
var groupEditors = [];
// 标记iframe内容的变化是因为谁的改变而产生的
// 我们可以明确地知道editor什么时候发生了改变，并且使得iframe发生改变
// 但是却不知道iframe发生了改变是因为editor的内容变了还是iframe自己变了
// 所以使用变量editorChanged来标记editor是否发生改变
// 初始时editorChanged为false
// 当editor发生改变时，更新editorChanged为true
// 当iframe发生改变时，判断editorChanged的值：如果为false，则表示这次改变是由iframe自身发起的；如果为true，则表示这次改变是由editor发起的。最后再将editorChanged更新为false（此处要注意：iframe刷新时，监听函数可能会监听到多个事件，比如先删除后插入发生时，事件会被监听到两次。若是在监听函数的mutations.forEach()方法中执行editorChanged值的更新，会导致只在第一次输出正确的结果，其余则由于editorChanged的值已经更新为false，而输出的错误的结果。所以需要并且只需要判断iframe的刷新事件发生了就行，而不需要知道发生了几次。所以就不需要遍历mutations了）
var editorChanged = false;
var iframeChanged = false;
//  创建页面元素
createIFrame();
createEditor();
createEditorAndIFrameGroup();
createEditorAndIFrameGroup();
createEditorAndIFrameGroup();

$().ready(function () {
	var iframe = $("iframe");
	var cnt = 0;
	
	iframe.on("load", function() {
		cnt ++;
		if (cnt == iframe.length) {
			bindEditorsAndIFrames();
		}
	});
})

function createEditor() {
	content.append(
		'<div class="pad">' + 
			'<div id="editor' + editorSeq + '" class="codearea"></div>' + 
		'</div>'
	);

	editors.push(editorFactory("editor"));
	editorSeq ++;
}

function createIFrame() {
	content.append(
		'<div class="pad">' + 
			'<iframe id="iframe' + iframeSeq + '" src="iframes/iframe' + iframeSeq + '.html" frameborder="0"></iframe>' + 
		'</div>'
	);
	iframeSeq ++;
}

function bindEditorAndIFrame(editor, frameId) {
	var frame = $("#" + frameId);
	if (!frame || !editor) {
		return null;
	}
	var iframeBody = frame.contents().find("body");
	
	setEditorValue(editor, iframeBody);
	observeEditor(editor, iframeBody);
	observeIFrame(iframeBody, editor);
}

function bindEditorsAndIFrames() {
	$("iframe").each(function() {
		var id = $(this).attr("id");
		
		if (id.indexOf("g_") !== 0) {
		// if (id.match(/^g_/) === null) {
			// 如果这个iframe不是和editor成对生成的iframe，则id取以“iframe”开头的
			var seq = parseInt(id.replace(/iframe/, ""));
			bindEditorAndIFrame(editors[seq], id);
		} else {
			// 如果这个iframe是和editor成对生成的iframe，则id取以“g_iframe”开头的
			var seq = parseInt(id.replace(/g_iframe/, ""));
			bindEditorAndIFrame(groupEditors[seq], id);
		}
	});
}

function createEditorForGroup() {
	content.append(
		'<div class="pad">' + 
			'<div id="g_editor' + groupSeq + '" class="codearea"></div>' + 
		'</div>'
	);
	groupEditors.push(editorFactory("g_editor"));
}

function createIFrameForGroup() {
	content.append(
		'<div class="pad">' + 
			'<iframe id="g_iframe' + groupSeq + '" src="iframes/iframe' + groupSeq + '.html" frameborder="0"></iframe>' + 
		'</div>'
	);
}

function createEditorAndIFrameGroup() {
	createEditorForGroup();
	createIFrameForGroup();
	groupSeq ++;
}

function editorFactory(editorId) {
	var editor = ace.edit(editorId + groupSeq);
	editor.setTheme("ace/theme/chrome");
	editor.session.setMode("ace/mode/html");
	var editorOptions = {
		enableLiveAutocompletion: true
	}
	editor.setOptions(editorOptions);
	editor.commands.addCommand({
		name: "Beautify Code",
		bindKey: {win: "ALT-SHIFT-F"},
		exec: function() {
			beautify.beautify(editor.session);
		},
		readOnly: false
	});
	return editor;
}

function setEditorValue(editor, iframeBody) {
	var iframeHtml = iframeBody.html();
	var newHtml = cleanInjectedCode(iframeHtml);
	editor.setValue(newHtml);
	editor.clearSelection();
	beautify.beautify(editor.session);
}

function observeEditor(editor, iframeBody) {
	editor.on("change", function (e) {
		// 前面提到的监听到的改变事件的次数的问题，这里有着相同 的问题，但是observeIFrame函数里面解决了，这里却没有找到解决方法
		// iframe发生改变后，editor里面监听到了四次变化，分别是：删除所有节点、新增所有节点、由于格式化代码而删除所有节点、由于格式化代码而新增所有节点
		if (iframeChanged) {
			// console.log("observeEditor: IFRAME CHANGED BY IFRAME");
			iframeChanged = false;
		} else {
			// console.log("observeEditor: IFRAME CHANGED BY EDITOR");
			// editor发生改变导致iframe发生改变，将editorChanged置为true
			editorChanged = true;
			iframeBody.html(editor.getValue());
		}
		// console.log(e);
		
	});
}

function observeIFrame(iframeBody, editor) {
	// 浏览器兼容
	var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
	// 配置对象
	var options = {attributes: true, childList: true, subtree: true};

	iframeBody.each(function () {
		var $this = $(this);
		var observer = new MutationObserver(function(mutations) {
			// 由于并不关心发生iframe发生几次改变以及每次改变都是什么，所以不用遍历mutations
            // mutations.forEach(function(record) {
            //     console.log(record);
			// });
            if (editorChanged) {
				// console.log("observeIFrame: IFRAME CHANGED BY EDITOR");
				editorChanged = false;
            } else {
                // console.log("observeIFrame: IFRAME CHANGED BY IFRAME");
				iframeChanged = true;
				setEditorValue(editor, $this);
            }
        });
		observer.observe($this[0], options);
	});
		
}

// 在使用VS Code的Live Server插件时，会往网页中自动注入一段代码
// 这个方法用来将那一段代码给隐藏掉
function cleanInjectedCode(htmlString) {
	var r = /<!-- Code injected by live-server -->(\s.*\s)*<\/script>\s/;

	var newHtml = ""
	if (htmlString) {
		newHtml = htmlString.replace(r, "");
	}
	return newHtml;
}
