(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*!
 * Knockout JavaScript library v3.4.0
 * (c) Steven Sanderson - http://knockoutjs.com/
 * License: MIT (http://www.opensource.org/licenses/mit-license.php)
 */

(function(){
var DEBUG=true;
(function(undefined){
    // (0, eval)('this') is a robust way of getting a reference to the global object
    // For details, see http://stackoverflow.com/questions/14119988/return-this-0-evalthis/14120023#14120023
    var window = this || (0, eval)('this'),
        document = window['document'],
        navigator = window['navigator'],
        jQueryInstance = window["jQuery"],
        JSON = window["JSON"];
(function(factory) {
    // Support three module loading scenarios
    if (typeof define === 'function' && define['amd']) {
        // [1] AMD anonymous module
        define(['exports', 'require'], factory);
    } else if (typeof exports === 'object' && typeof module === 'object') {
        // [2] CommonJS/Node.js
        factory(module['exports'] || exports);  // module.exports is for Node.js
    } else {
        // [3] No module loader (plain <script> tag) - put directly in global namespace
        factory(window['ko'] = {});
    }
}(function(koExports, amdRequire){
// Internally, all KO objects are attached to koExports (even the non-exported ones whose names will be minified by the closure compiler).
// In the future, the following "ko" variable may be made distinct from "koExports" so that private objects are not externally reachable.
var ko = typeof koExports !== 'undefined' ? koExports : {};
// Google Closure Compiler helpers (used only to make the minified file smaller)
ko.exportSymbol = function(koPath, object) {
    var tokens = koPath.split(".");

    // In the future, "ko" may become distinct from "koExports" (so that non-exported objects are not reachable)
    // At that point, "target" would be set to: (typeof koExports !== "undefined" ? koExports : ko)
    var target = ko;

    for (var i = 0; i < tokens.length - 1; i++)
        target = target[tokens[i]];
    target[tokens[tokens.length - 1]] = object;
};
ko.exportProperty = function(owner, publicName, object) {
    owner[publicName] = object;
};
ko.version = "3.4.0";

ko.exportSymbol('version', ko.version);
// For any options that may affect various areas of Knockout and aren't directly associated with data binding.
ko.options = {
    'deferUpdates': false,
    'useOnlyNativeEvents': false
};

//ko.exportSymbol('options', ko.options);   // 'options' isn't minified
ko.utils = (function () {
    function objectForEach(obj, action) {
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                action(prop, obj[prop]);
            }
        }
    }

    function extend(target, source) {
        if (source) {
            for(var prop in source) {
                if(source.hasOwnProperty(prop)) {
                    target[prop] = source[prop];
                }
            }
        }
        return target;
    }

    function setPrototypeOf(obj, proto) {
        obj.__proto__ = proto;
        return obj;
    }

    var canSetPrototype = ({ __proto__: [] } instanceof Array);
    var canUseSymbols = !DEBUG && typeof Symbol === 'function';

    // Represent the known event types in a compact way, then at runtime transform it into a hash with event name as key (for fast lookup)
    var knownEvents = {}, knownEventTypesByEventName = {};
    var keyEventTypeName = (navigator && /Firefox\/2/i.test(navigator.userAgent)) ? 'KeyboardEvent' : 'UIEvents';
    knownEvents[keyEventTypeName] = ['keyup', 'keydown', 'keypress'];
    knownEvents['MouseEvents'] = ['click', 'dblclick', 'mousedown', 'mouseup', 'mousemove', 'mouseover', 'mouseout', 'mouseenter', 'mouseleave'];
    objectForEach(knownEvents, function(eventType, knownEventsForType) {
        if (knownEventsForType.length) {
            for (var i = 0, j = knownEventsForType.length; i < j; i++)
                knownEventTypesByEventName[knownEventsForType[i]] = eventType;
        }
    });
    var eventsThatMustBeRegisteredUsingAttachEvent = { 'propertychange': true }; // Workaround for an IE9 issue - https://github.com/SteveSanderson/knockout/issues/406

    // Detect IE versions for bug workarounds (uses IE conditionals, not UA string, for robustness)
    // Note that, since IE 10 does not support conditional comments, the following logic only detects IE < 10.
    // Currently this is by design, since IE 10+ behaves correctly when treated as a standard browser.
    // If there is a future need to detect specific versions of IE10+, we will amend this.
    var ieVersion = document && (function() {
        var version = 3, div = document.createElement('div'), iElems = div.getElementsByTagName('i');

        // Keep constructing conditional HTML blocks until we hit one that resolves to an empty fragment
        while (
            div.innerHTML = '<!--[if gt IE ' + (++version) + ']><i></i><![endif]-->',
            iElems[0]
        ) {}
        return version > 4 ? version : undefined;
    }());
    var isIe6 = ieVersion === 6,
        isIe7 = ieVersion === 7;

    function isClickOnCheckableElement(element, eventType) {
        if ((ko.utils.tagNameLower(element) !== "input") || !element.type) return false;
        if (eventType.toLowerCase() != "click") return false;
        var inputType = element.type;
        return (inputType == "checkbox") || (inputType == "radio");
    }

    // For details on the pattern for changing node classes
    // see: https://github.com/knockout/knockout/issues/1597
    var cssClassNameRegex = /\S+/g;

    function toggleDomNodeCssClass(node, classNames, shouldHaveClass) {
        var addOrRemoveFn;
        if (classNames) {
            if (typeof node.classList === 'object') {
                addOrRemoveFn = node.classList[shouldHaveClass ? 'add' : 'remove'];
                ko.utils.arrayForEach(classNames.match(cssClassNameRegex), function(className) {
                    addOrRemoveFn.call(node.classList, className);
                });
            } else if (typeof node.className['baseVal'] === 'string') {
                // SVG tag .classNames is an SVGAnimatedString instance
                toggleObjectClassPropertyString(node.className, 'baseVal', classNames, shouldHaveClass);
            } else {
                // node.className ought to be a string.
                toggleObjectClassPropertyString(node, 'className', classNames, shouldHaveClass);
            }
        }
    }

    function toggleObjectClassPropertyString(obj, prop, classNames, shouldHaveClass) {
        // obj/prop is either a node/'className' or a SVGAnimatedString/'baseVal'.
        var currentClassNames = obj[prop].match(cssClassNameRegex) || [];
        ko.utils.arrayForEach(classNames.match(cssClassNameRegex), function(className) {
            ko.utils.addOrRemoveItem(currentClassNames, className, shouldHaveClass);
        });
        obj[prop] = currentClassNames.join(" ");
    }

    return {
        fieldsIncludedWithJsonPost: ['authenticity_token', /^__RequestVerificationToken(_.*)?$/],

        arrayForEach: function (array, action) {
            for (var i = 0, j = array.length; i < j; i++)
                action(array[i], i);
        },

        arrayIndexOf: function (array, item) {
            if (typeof Array.prototype.indexOf == "function")
                return Array.prototype.indexOf.call(array, item);
            for (var i = 0, j = array.length; i < j; i++)
                if (array[i] === item)
                    return i;
            return -1;
        },

        arrayFirst: function (array, predicate, predicateOwner) {
            for (var i = 0, j = array.length; i < j; i++)
                if (predicate.call(predicateOwner, array[i], i))
                    return array[i];
            return null;
        },

        arrayRemoveItem: function (array, itemToRemove) {
            var index = ko.utils.arrayIndexOf(array, itemToRemove);
            if (index > 0) {
                array.splice(index, 1);
            }
            else if (index === 0) {
                array.shift();
            }
        },

        arrayGetDistinctValues: function (array) {
            array = array || [];
            var result = [];
            for (var i = 0, j = array.length; i < j; i++) {
                if (ko.utils.arrayIndexOf(result, array[i]) < 0)
                    result.push(array[i]);
            }
            return result;
        },

        arrayMap: function (array, mapping) {
            array = array || [];
            var result = [];
            for (var i = 0, j = array.length; i < j; i++)
                result.push(mapping(array[i], i));
            return result;
        },

        arrayFilter: function (array, predicate) {
            array = array || [];
            var result = [];
            for (var i = 0, j = array.length; i < j; i++)
                if (predicate(array[i], i))
                    result.push(array[i]);
            return result;
        },

        arrayPushAll: function (array, valuesToPush) {
            if (valuesToPush instanceof Array)
                array.push.apply(array, valuesToPush);
            else
                for (var i = 0, j = valuesToPush.length; i < j; i++)
                    array.push(valuesToPush[i]);
            return array;
        },

        addOrRemoveItem: function(array, value, included) {
            var existingEntryIndex = ko.utils.arrayIndexOf(ko.utils.peekObservable(array), value);
            if (existingEntryIndex < 0) {
                if (included)
                    array.push(value);
            } else {
                if (!included)
                    array.splice(existingEntryIndex, 1);
            }
        },

        canSetPrototype: canSetPrototype,

        extend: extend,

        setPrototypeOf: setPrototypeOf,

        setPrototypeOfOrExtend: canSetPrototype ? setPrototypeOf : extend,

        objectForEach: objectForEach,

        objectMap: function(source, mapping) {
            if (!source)
                return source;
            var target = {};
            for (var prop in source) {
                if (source.hasOwnProperty(prop)) {
                    target[prop] = mapping(source[prop], prop, source);
                }
            }
            return target;
        },

        emptyDomNode: function (domNode) {
            while (domNode.firstChild) {
                ko.removeNode(domNode.firstChild);
            }
        },

        moveCleanedNodesToContainerElement: function(nodes) {
            // Ensure it's a real array, as we're about to reparent the nodes and
            // we don't want the underlying collection to change while we're doing that.
            var nodesArray = ko.utils.makeArray(nodes);
            var templateDocument = (nodesArray[0] && nodesArray[0].ownerDocument) || document;

            var container = templateDocument.createElement('div');
            for (var i = 0, j = nodesArray.length; i < j; i++) {
                container.appendChild(ko.cleanNode(nodesArray[i]));
            }
            return container;
        },

        cloneNodes: function (nodesArray, shouldCleanNodes) {
            for (var i = 0, j = nodesArray.length, newNodesArray = []; i < j; i++) {
                var clonedNode = nodesArray[i].cloneNode(true);
                newNodesArray.push(shouldCleanNodes ? ko.cleanNode(clonedNode) : clonedNode);
            }
            return newNodesArray;
        },

        setDomNodeChildren: function (domNode, childNodes) {
            ko.utils.emptyDomNode(domNode);
            if (childNodes) {
                for (var i = 0, j = childNodes.length; i < j; i++)
                    domNode.appendChild(childNodes[i]);
            }
        },

        replaceDomNodes: function (nodeToReplaceOrNodeArray, newNodesArray) {
            var nodesToReplaceArray = nodeToReplaceOrNodeArray.nodeType ? [nodeToReplaceOrNodeArray] : nodeToReplaceOrNodeArray;
            if (nodesToReplaceArray.length > 0) {
                var insertionPoint = nodesToReplaceArray[0];
                var parent = insertionPoint.parentNode;
                for (var i = 0, j = newNodesArray.length; i < j; i++)
                    parent.insertBefore(newNodesArray[i], insertionPoint);
                for (var i = 0, j = nodesToReplaceArray.length; i < j; i++) {
                    ko.removeNode(nodesToReplaceArray[i]);
                }
            }
        },

        fixUpContinuousNodeArray: function(continuousNodeArray, parentNode) {
            // Before acting on a set of nodes that were previously outputted by a template function, we have to reconcile
            // them against what is in the DOM right now. It may be that some of the nodes have already been removed, or that
            // new nodes might have been inserted in the middle, for example by a binding. Also, there may previously have been
            // leading comment nodes (created by rewritten string-based templates) that have since been removed during binding.
            // So, this function translates the old "map" output array into its best guess of the set of current DOM nodes.
            //
            // Rules:
            //   [A] Any leading nodes that have been removed should be ignored
            //       These most likely correspond to memoization nodes that were already removed during binding
            //       See https://github.com/knockout/knockout/pull/440
            //   [B] Any trailing nodes that have been remove should be ignored
            //       This prevents the code here from adding unrelated nodes to the array while processing rule [C]
            //       See https://github.com/knockout/knockout/pull/1903
            //   [C] We want to output a continuous series of nodes. So, ignore any nodes that have already been removed,
            //       and include any nodes that have been inserted among the previous collection

            if (continuousNodeArray.length) {
                // The parent node can be a virtual element; so get the real parent node
                parentNode = (parentNode.nodeType === 8 && parentNode.parentNode) || parentNode;

                // Rule [A]
                while (continuousNodeArray.length && continuousNodeArray[0].parentNode !== parentNode)
                    continuousNodeArray.splice(0, 1);

                // Rule [B]
                while (continuousNodeArray.length > 1 && continuousNodeArray[continuousNodeArray.length - 1].parentNode !== parentNode)
                    continuousNodeArray.length--;

                // Rule [C]
                if (continuousNodeArray.length > 1) {
                    var current = continuousNodeArray[0], last = continuousNodeArray[continuousNodeArray.length - 1];
                    // Replace with the actual new continuous node set
                    continuousNodeArray.length = 0;
                    while (current !== last) {
                        continuousNodeArray.push(current);
                        current = current.nextSibling;
                    }
                    continuousNodeArray.push(last);
                }
            }
            return continuousNodeArray;
        },

        setOptionNodeSelectionState: function (optionNode, isSelected) {
            // IE6 sometimes throws "unknown error" if you try to write to .selected directly, whereas Firefox struggles with setAttribute. Pick one based on browser.
            if (ieVersion < 7)
                optionNode.setAttribute("selected", isSelected);
            else
                optionNode.selected = isSelected;
        },

        stringTrim: function (string) {
            return string === null || string === undefined ? '' :
                string.trim ?
                    string.trim() :
                    string.toString().replace(/^[\s\xa0]+|[\s\xa0]+$/g, '');
        },

        stringStartsWith: function (string, startsWith) {
            string = string || "";
            if (startsWith.length > string.length)
                return false;
            return string.substring(0, startsWith.length) === startsWith;
        },

        domNodeIsContainedBy: function (node, containedByNode) {
            if (node === containedByNode)
                return true;
            if (node.nodeType === 11)
                return false; // Fixes issue #1162 - can't use node.contains for document fragments on IE8
            if (containedByNode.contains)
                return containedByNode.contains(node.nodeType === 3 ? node.parentNode : node);
            if (containedByNode.compareDocumentPosition)
                return (containedByNode.compareDocumentPosition(node) & 16) == 16;
            while (node && node != containedByNode) {
                node = node.parentNode;
            }
            return !!node;
        },

        domNodeIsAttachedToDocument: function (node) {
            return ko.utils.domNodeIsContainedBy(node, node.ownerDocument.documentElement);
        },

        anyDomNodeIsAttachedToDocument: function(nodes) {
            return !!ko.utils.arrayFirst(nodes, ko.utils.domNodeIsAttachedToDocument);
        },

        tagNameLower: function(element) {
            // For HTML elements, tagName will always be upper case; for XHTML elements, it'll be lower case.
            // Possible future optimization: If we know it's an element from an XHTML document (not HTML),
            // we don't need to do the .toLowerCase() as it will always be lower case anyway.
            return element && element.tagName && element.tagName.toLowerCase();
        },

        catchFunctionErrors: function (delegate) {
            return ko['onError'] ? function () {
                try {
                    return delegate.apply(this, arguments);
                } catch (e) {
                    ko['onError'] && ko['onError'](e);
                    throw e;
                }
            } : delegate;
        },

        setTimeout: function (handler, timeout) {
            return setTimeout(ko.utils.catchFunctionErrors(handler), timeout);
        },

        deferError: function (error) {
            setTimeout(function () {
                ko['onError'] && ko['onError'](error);
                throw error;
            }, 0);
        },

        registerEventHandler: function (element, eventType, handler) {
            var wrappedHandler = ko.utils.catchFunctionErrors(handler);

            var mustUseAttachEvent = ieVersion && eventsThatMustBeRegisteredUsingAttachEvent[eventType];
            if (!ko.options['useOnlyNativeEvents'] && !mustUseAttachEvent && jQueryInstance) {
                jQueryInstance(element)['bind'](eventType, wrappedHandler);
            } else if (!mustUseAttachEvent && typeof element.addEventListener == "function")
                element.addEventListener(eventType, wrappedHandler, false);
            else if (typeof element.attachEvent != "undefined") {
                var attachEventHandler = function (event) { wrappedHandler.call(element, event); },
                    attachEventName = "on" + eventType;
                element.attachEvent(attachEventName, attachEventHandler);

                // IE does not dispose attachEvent handlers automatically (unlike with addEventListener)
                // so to avoid leaks, we have to remove them manually. See bug #856
                ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
                    element.detachEvent(attachEventName, attachEventHandler);
                });
            } else
                throw new Error("Browser doesn't support addEventListener or attachEvent");
        },

        triggerEvent: function (element, eventType) {
            if (!(element && element.nodeType))
                throw new Error("element must be a DOM node when calling triggerEvent");

            // For click events on checkboxes and radio buttons, jQuery toggles the element checked state *after* the
            // event handler runs instead of *before*. (This was fixed in 1.9 for checkboxes but not for radio buttons.)
            // IE doesn't change the checked state when you trigger the click event using "fireEvent".
            // In both cases, we'll use the click method instead.
            var useClickWorkaround = isClickOnCheckableElement(element, eventType);

            if (!ko.options['useOnlyNativeEvents'] && jQueryInstance && !useClickWorkaround) {
                jQueryInstance(element)['trigger'](eventType);
            } else if (typeof document.createEvent == "function") {
                if (typeof element.dispatchEvent == "function") {
                    var eventCategory = knownEventTypesByEventName[eventType] || "HTMLEvents";
                    var event = document.createEvent(eventCategory);
                    event.initEvent(eventType, true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, element);
                    element.dispatchEvent(event);
                }
                else
                    throw new Error("The supplied element doesn't support dispatchEvent");
            } else if (useClickWorkaround && element.click) {
                element.click();
            } else if (typeof element.fireEvent != "undefined") {
                element.fireEvent("on" + eventType);
            } else {
                throw new Error("Browser doesn't support triggering events");
            }
        },

        unwrapObservable: function (value) {
            return ko.isObservable(value) ? value() : value;
        },

        peekObservable: function (value) {
            return ko.isObservable(value) ? value.peek() : value;
        },

        toggleDomNodeCssClass: toggleDomNodeCssClass,

        setTextContent: function(element, textContent) {
            var value = ko.utils.unwrapObservable(textContent);
            if ((value === null) || (value === undefined))
                value = "";

            // We need there to be exactly one child: a text node.
            // If there are no children, more than one, or if it's not a text node,
            // we'll clear everything and create a single text node.
            var innerTextNode = ko.virtualElements.firstChild(element);
            if (!innerTextNode || innerTextNode.nodeType != 3 || ko.virtualElements.nextSibling(innerTextNode)) {
                ko.virtualElements.setDomNodeChildren(element, [element.ownerDocument.createTextNode(value)]);
            } else {
                innerTextNode.data = value;
            }

            ko.utils.forceRefresh(element);
        },

        setElementName: function(element, name) {
            element.name = name;

            // Workaround IE 6/7 issue
            // - https://github.com/SteveSanderson/knockout/issues/197
            // - http://www.matts411.com/post/setting_the_name_attribute_in_ie_dom/
            if (ieVersion <= 7) {
                try {
                    element.mergeAttributes(document.createElement("<input name='" + element.name + "'/>"), false);
                }
                catch(e) {} // For IE9 with doc mode "IE9 Standards" and browser mode "IE9 Compatibility View"
            }
        },

        forceRefresh: function(node) {
            // Workaround for an IE9 rendering bug - https://github.com/SteveSanderson/knockout/issues/209
            if (ieVersion >= 9) {
                // For text nodes and comment nodes (most likely virtual elements), we will have to refresh the container
                var elem = node.nodeType == 1 ? node : node.parentNode;
                if (elem.style)
                    elem.style.zoom = elem.style.zoom;
            }
        },

        ensureSelectElementIsRenderedCorrectly: function(selectElement) {
            // Workaround for IE9 rendering bug - it doesn't reliably display all the text in dynamically-added select boxes unless you force it to re-render by updating the width.
            // (See https://github.com/SteveSanderson/knockout/issues/312, http://stackoverflow.com/questions/5908494/select-only-shows-first-char-of-selected-option)
            // Also fixes IE7 and IE8 bug that causes selects to be zero width if enclosed by 'if' or 'with'. (See issue #839)
            if (ieVersion) {
                var originalWidth = selectElement.style.width;
                selectElement.style.width = 0;
                selectElement.style.width = originalWidth;
            }
        },

        range: function (min, max) {
            min = ko.utils.unwrapObservable(min);
            max = ko.utils.unwrapObservable(max);
            var result = [];
            for (var i = min; i <= max; i++)
                result.push(i);
            return result;
        },

        makeArray: function(arrayLikeObject) {
            var result = [];
            for (var i = 0, j = arrayLikeObject.length; i < j; i++) {
                result.push(arrayLikeObject[i]);
            };
            return result;
        },

        createSymbolOrString: function(identifier) {
            return canUseSymbols ? Symbol(identifier) : identifier;
        },

        isIe6 : isIe6,
        isIe7 : isIe7,
        ieVersion : ieVersion,

        getFormFields: function(form, fieldName) {
            var fields = ko.utils.makeArray(form.getElementsByTagName("input")).concat(ko.utils.makeArray(form.getElementsByTagName("textarea")));
            var isMatchingField = (typeof fieldName == 'string')
                ? function(field) { return field.name === fieldName }
                : function(field) { return fieldName.test(field.name) }; // Treat fieldName as regex or object containing predicate
            var matches = [];
            for (var i = fields.length - 1; i >= 0; i--) {
                if (isMatchingField(fields[i]))
                    matches.push(fields[i]);
            };
            return matches;
        },

        parseJson: function (jsonString) {
            if (typeof jsonString == "string") {
                jsonString = ko.utils.stringTrim(jsonString);
                if (jsonString) {
                    if (JSON && JSON.parse) // Use native parsing where available
                        return JSON.parse(jsonString);
                    return (new Function("return " + jsonString))(); // Fallback on less safe parsing for older browsers
                }
            }
            return null;
        },

        stringifyJson: function (data, replacer, space) {   // replacer and space are optional
            if (!JSON || !JSON.stringify)
                throw new Error("Cannot find JSON.stringify(). Some browsers (e.g., IE < 8) don't support it natively, but you can overcome this by adding a script reference to json2.js, downloadable from http://www.json.org/json2.js");
            return JSON.stringify(ko.utils.unwrapObservable(data), replacer, space);
        },

        postJson: function (urlOrForm, data, options) {
            options = options || {};
            var params = options['params'] || {};
            var includeFields = options['includeFields'] || this.fieldsIncludedWithJsonPost;
            var url = urlOrForm;

            // If we were given a form, use its 'action' URL and pick out any requested field values
            if((typeof urlOrForm == 'object') && (ko.utils.tagNameLower(urlOrForm) === "form")) {
                var originalForm = urlOrForm;
                url = originalForm.action;
                for (var i = includeFields.length - 1; i >= 0; i--) {
                    var fields = ko.utils.getFormFields(originalForm, includeFields[i]);
                    for (var j = fields.length - 1; j >= 0; j--)
                        params[fields[j].name] = fields[j].value;
                }
            }

            data = ko.utils.unwrapObservable(data);
            var form = document.createElement("form");
            form.style.display = "none";
            form.action = url;
            form.method = "post";
            for (var key in data) {
                // Since 'data' this is a model object, we include all properties including those inherited from its prototype
                var input = document.createElement("input");
                input.type = "hidden";
                input.name = key;
                input.value = ko.utils.stringifyJson(ko.utils.unwrapObservable(data[key]));
                form.appendChild(input);
            }
            objectForEach(params, function(key, value) {
                var input = document.createElement("input");
                input.type = "hidden";
                input.name = key;
                input.value = value;
                form.appendChild(input);
            });
            document.body.appendChild(form);
            options['submitter'] ? options['submitter'](form) : form.submit();
            setTimeout(function () { form.parentNode.removeChild(form); }, 0);
        }
    }
}());

ko.exportSymbol('utils', ko.utils);
ko.exportSymbol('utils.arrayForEach', ko.utils.arrayForEach);
ko.exportSymbol('utils.arrayFirst', ko.utils.arrayFirst);
ko.exportSymbol('utils.arrayFilter', ko.utils.arrayFilter);
ko.exportSymbol('utils.arrayGetDistinctValues', ko.utils.arrayGetDistinctValues);
ko.exportSymbol('utils.arrayIndexOf', ko.utils.arrayIndexOf);
ko.exportSymbol('utils.arrayMap', ko.utils.arrayMap);
ko.exportSymbol('utils.arrayPushAll', ko.utils.arrayPushAll);
ko.exportSymbol('utils.arrayRemoveItem', ko.utils.arrayRemoveItem);
ko.exportSymbol('utils.extend', ko.utils.extend);
ko.exportSymbol('utils.fieldsIncludedWithJsonPost', ko.utils.fieldsIncludedWithJsonPost);
ko.exportSymbol('utils.getFormFields', ko.utils.getFormFields);
ko.exportSymbol('utils.peekObservable', ko.utils.peekObservable);
ko.exportSymbol('utils.postJson', ko.utils.postJson);
ko.exportSymbol('utils.parseJson', ko.utils.parseJson);
ko.exportSymbol('utils.registerEventHandler', ko.utils.registerEventHandler);
ko.exportSymbol('utils.stringifyJson', ko.utils.stringifyJson);
ko.exportSymbol('utils.range', ko.utils.range);
ko.exportSymbol('utils.toggleDomNodeCssClass', ko.utils.toggleDomNodeCssClass);
ko.exportSymbol('utils.triggerEvent', ko.utils.triggerEvent);
ko.exportSymbol('utils.unwrapObservable', ko.utils.unwrapObservable);
ko.exportSymbol('utils.objectForEach', ko.utils.objectForEach);
ko.exportSymbol('utils.addOrRemoveItem', ko.utils.addOrRemoveItem);
ko.exportSymbol('utils.setTextContent', ko.utils.setTextContent);
ko.exportSymbol('unwrap', ko.utils.unwrapObservable); // Convenient shorthand, because this is used so commonly

if (!Function.prototype['bind']) {
    // Function.prototype.bind is a standard part of ECMAScript 5th Edition (December 2009, http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-262.pdf)
    // In case the browser doesn't implement it natively, provide a JavaScript implementation. This implementation is based on the one in prototype.js
    Function.prototype['bind'] = function (object) {
        var originalFunction = this;
        if (arguments.length === 1) {
            return function () {
                return originalFunction.apply(object, arguments);
            };
        } else {
            var partialArgs = Array.prototype.slice.call(arguments, 1);
            return function () {
                var args = partialArgs.slice(0);
                args.push.apply(args, arguments);
                return originalFunction.apply(object, args);
            };
        }
    };
}

ko.utils.domData = new (function () {
    var uniqueId = 0;
    var dataStoreKeyExpandoPropertyName = "__ko__" + (new Date).getTime();
    var dataStore = {};

    function getAll(node, createIfNotFound) {
        var dataStoreKey = node[dataStoreKeyExpandoPropertyName];
        var hasExistingDataStore = dataStoreKey && (dataStoreKey !== "null") && dataStore[dataStoreKey];
        if (!hasExistingDataStore) {
            if (!createIfNotFound)
                return undefined;
            dataStoreKey = node[dataStoreKeyExpandoPropertyName] = "ko" + uniqueId++;
            dataStore[dataStoreKey] = {};
        }
        return dataStore[dataStoreKey];
    }

    return {
        get: function (node, key) {
            var allDataForNode = getAll(node, false);
            return allDataForNode === undefined ? undefined : allDataForNode[key];
        },
        set: function (node, key, value) {
            if (value === undefined) {
                // Make sure we don't actually create a new domData key if we are actually deleting a value
                if (getAll(node, false) === undefined)
                    return;
            }
            var allDataForNode = getAll(node, true);
            allDataForNode[key] = value;
        },
        clear: function (node) {
            var dataStoreKey = node[dataStoreKeyExpandoPropertyName];
            if (dataStoreKey) {
                delete dataStore[dataStoreKey];
                node[dataStoreKeyExpandoPropertyName] = null;
                return true; // Exposing "did clean" flag purely so specs can infer whether things have been cleaned up as intended
            }
            return false;
        },

        nextKey: function () {
            return (uniqueId++) + dataStoreKeyExpandoPropertyName;
        }
    };
})();

ko.exportSymbol('utils.domData', ko.utils.domData);
ko.exportSymbol('utils.domData.clear', ko.utils.domData.clear); // Exporting only so specs can clear up after themselves fully

ko.utils.domNodeDisposal = new (function () {
    var domDataKey = ko.utils.domData.nextKey();
    var cleanableNodeTypes = { 1: true, 8: true, 9: true };       // Element, Comment, Document
    var cleanableNodeTypesWithDescendants = { 1: true, 9: true }; // Element, Document

    function getDisposeCallbacksCollection(node, createIfNotFound) {
        var allDisposeCallbacks = ko.utils.domData.get(node, domDataKey);
        if ((allDisposeCallbacks === undefined) && createIfNotFound) {
            allDisposeCallbacks = [];
            ko.utils.domData.set(node, domDataKey, allDisposeCallbacks);
        }
        return allDisposeCallbacks;
    }
    function destroyCallbacksCollection(node) {
        ko.utils.domData.set(node, domDataKey, undefined);
    }

    function cleanSingleNode(node) {
        // Run all the dispose callbacks
        var callbacks = getDisposeCallbacksCollection(node, false);
        if (callbacks) {
            callbacks = callbacks.slice(0); // Clone, as the array may be modified during iteration (typically, callbacks will remove themselves)
            for (var i = 0; i < callbacks.length; i++)
                callbacks[i](node);
        }

        // Erase the DOM data
        ko.utils.domData.clear(node);

        // Perform cleanup needed by external libraries (currently only jQuery, but can be extended)
        ko.utils.domNodeDisposal["cleanExternalData"](node);

        // Clear any immediate-child comment nodes, as these wouldn't have been found by
        // node.getElementsByTagName("*") in cleanNode() (comment nodes aren't elements)
        if (cleanableNodeTypesWithDescendants[node.nodeType])
            cleanImmediateCommentTypeChildren(node);
    }

    function cleanImmediateCommentTypeChildren(nodeWithChildren) {
        var child, nextChild = nodeWithChildren.firstChild;
        while (child = nextChild) {
            nextChild = child.nextSibling;
            if (child.nodeType === 8)
                cleanSingleNode(child);
        }
    }

    return {
        addDisposeCallback : function(node, callback) {
            if (typeof callback != "function")
                throw new Error("Callback must be a function");
            getDisposeCallbacksCollection(node, true).push(callback);
        },

        removeDisposeCallback : function(node, callback) {
            var callbacksCollection = getDisposeCallbacksCollection(node, false);
            if (callbacksCollection) {
                ko.utils.arrayRemoveItem(callbacksCollection, callback);
                if (callbacksCollection.length == 0)
                    destroyCallbacksCollection(node);
            }
        },

        cleanNode : function(node) {
            // First clean this node, where applicable
            if (cleanableNodeTypes[node.nodeType]) {
                cleanSingleNode(node);

                // ... then its descendants, where applicable
                if (cleanableNodeTypesWithDescendants[node.nodeType]) {
                    // Clone the descendants list in case it changes during iteration
                    var descendants = [];
                    ko.utils.arrayPushAll(descendants, node.getElementsByTagName("*"));
                    for (var i = 0, j = descendants.length; i < j; i++)
                        cleanSingleNode(descendants[i]);
                }
            }
            return node;
        },

        removeNode : function(node) {
            ko.cleanNode(node);
            if (node.parentNode)
                node.parentNode.removeChild(node);
        },

        "cleanExternalData" : function (node) {
            // Special support for jQuery here because it's so commonly used.
            // Many jQuery plugins (including jquery.tmpl) store data using jQuery's equivalent of domData
            // so notify it to tear down any resources associated with the node & descendants here.
            if (jQueryInstance && (typeof jQueryInstance['cleanData'] == "function"))
                jQueryInstance['cleanData']([node]);
        }
    };
})();
ko.cleanNode = ko.utils.domNodeDisposal.cleanNode; // Shorthand name for convenience
ko.removeNode = ko.utils.domNodeDisposal.removeNode; // Shorthand name for convenience
ko.exportSymbol('cleanNode', ko.cleanNode);
ko.exportSymbol('removeNode', ko.removeNode);
ko.exportSymbol('utils.domNodeDisposal', ko.utils.domNodeDisposal);
ko.exportSymbol('utils.domNodeDisposal.addDisposeCallback', ko.utils.domNodeDisposal.addDisposeCallback);
ko.exportSymbol('utils.domNodeDisposal.removeDisposeCallback', ko.utils.domNodeDisposal.removeDisposeCallback);
(function () {
    var none = [0, "", ""],
        table = [1, "<table>", "</table>"],
        tbody = [2, "<table><tbody>", "</tbody></table>"],
        tr = [3, "<table><tbody><tr>", "</tr></tbody></table>"],
        select = [1, "<select multiple='multiple'>", "</select>"],
        lookup = {
            'thead': table,
            'tbody': table,
            'tfoot': table,
            'tr': tbody,
            'td': tr,
            'th': tr,
            'option': select,
            'optgroup': select
        },

        // This is needed for old IE if you're *not* using either jQuery or innerShiv. Doesn't affect other cases.
        mayRequireCreateElementHack = ko.utils.ieVersion <= 8;

    function getWrap(tags) {
        var m = tags.match(/^<([a-z]+)[ >]/);
        return (m && lookup[m[1]]) || none;
    }

    function simpleHtmlParse(html, documentContext) {
        documentContext || (documentContext = document);
        var windowContext = documentContext['parentWindow'] || documentContext['defaultView'] || window;

        // Based on jQuery's "clean" function, but only accounting for table-related elements.
        // If you have referenced jQuery, this won't be used anyway - KO will use jQuery's "clean" function directly

        // Note that there's still an issue in IE < 9 whereby it will discard comment nodes that are the first child of
        // a descendant node. For example: "<div><!-- mycomment -->abc</div>" will get parsed as "<div>abc</div>"
        // This won't affect anyone who has referenced jQuery, and there's always the workaround of inserting a dummy node
        // (possibly a text node) in front of the comment. So, KO does not attempt to workaround this IE issue automatically at present.

        // Trim whitespace, otherwise indexOf won't work as expected
        var tags = ko.utils.stringTrim(html).toLowerCase(), div = documentContext.createElement("div"),
            wrap = getWrap(tags),
            depth = wrap[0];

        // Go to html and back, then peel off extra wrappers
        // Note that we always prefix with some dummy text, because otherwise, IE<9 will strip out leading comment nodes in descendants. Total madness.
        var markup = "ignored<div>" + wrap[1] + html + wrap[2] + "</div>";
        if (typeof windowContext['innerShiv'] == "function") {
            // Note that innerShiv is deprecated in favour of html5shiv. We should consider adding
            // support for html5shiv (except if no explicit support is needed, e.g., if html5shiv
            // somehow shims the native APIs so it just works anyway)
            div.appendChild(windowContext['innerShiv'](markup));
        } else {
            if (mayRequireCreateElementHack) {
                // The document.createElement('my-element') trick to enable custom elements in IE6-8
                // only works if we assign innerHTML on an element associated with that document.
                documentContext.appendChild(div);
            }

            div.innerHTML = markup;

            if (mayRequireCreateElementHack) {
                div.parentNode.removeChild(div);
            }
        }

        // Move to the right depth
        while (depth--)
            div = div.lastChild;

        return ko.utils.makeArray(div.lastChild.childNodes);
    }

    function jQueryHtmlParse(html, documentContext) {
        // jQuery's "parseHTML" function was introduced in jQuery 1.8.0 and is a documented public API.
        if (jQueryInstance['parseHTML']) {
            return jQueryInstance['parseHTML'](html, documentContext) || []; // Ensure we always return an array and never null
        } else {
            // For jQuery < 1.8.0, we fall back on the undocumented internal "clean" function.
            var elems = jQueryInstance['clean']([html], documentContext);

            // As of jQuery 1.7.1, jQuery parses the HTML by appending it to some dummy parent nodes held in an in-memory document fragment.
            // Unfortunately, it never clears the dummy parent nodes from the document fragment, so it leaks memory over time.
            // Fix this by finding the top-most dummy parent element, and detaching it from its owner fragment.
            if (elems && elems[0]) {
                // Find the top-most parent element that's a direct child of a document fragment
                var elem = elems[0];
                while (elem.parentNode && elem.parentNode.nodeType !== 11 /* i.e., DocumentFragment */)
                    elem = elem.parentNode;
                // ... then detach it
                if (elem.parentNode)
                    elem.parentNode.removeChild(elem);
            }

            return elems;
        }
    }

    ko.utils.parseHtmlFragment = function(html, documentContext) {
        return jQueryInstance ?
            jQueryHtmlParse(html, documentContext) :   // As below, benefit from jQuery's optimisations where possible
            simpleHtmlParse(html, documentContext);  // ... otherwise, this simple logic will do in most common cases.
    };

    ko.utils.setHtml = function(node, html) {
        ko.utils.emptyDomNode(node);

        // There's no legitimate reason to display a stringified observable without unwrapping it, so we'll unwrap it
        html = ko.utils.unwrapObservable(html);

        if ((html !== null) && (html !== undefined)) {
            if (typeof html != 'string')
                html = html.toString();

            // jQuery contains a lot of sophisticated code to parse arbitrary HTML fragments,
            // for example <tr> elements which are not normally allowed to exist on their own.
            // If you've referenced jQuery we'll use that rather than duplicating its code.
            if (jQueryInstance) {
                jQueryInstance(node)['html'](html);
            } else {
                // ... otherwise, use KO's own parsing logic.
                var parsedNodes = ko.utils.parseHtmlFragment(html, node.ownerDocument);
                for (var i = 0; i < parsedNodes.length; i++)
                    node.appendChild(parsedNodes[i]);
            }
        }
    };
})();

ko.exportSymbol('utils.parseHtmlFragment', ko.utils.parseHtmlFragment);
ko.exportSymbol('utils.setHtml', ko.utils.setHtml);

ko.memoization = (function () {
    var memos = {};

    function randomMax8HexChars() {
        return (((1 + Math.random()) * 0x100000000) | 0).toString(16).substring(1);
    }
    function generateRandomId() {
        return randomMax8HexChars() + randomMax8HexChars();
    }
    function findMemoNodes(rootNode, appendToArray) {
        if (!rootNode)
            return;
        if (rootNode.nodeType == 8) {
            var memoId = ko.memoization.parseMemoText(rootNode.nodeValue);
            if (memoId != null)
                appendToArray.push({ domNode: rootNode, memoId: memoId });
        } else if (rootNode.nodeType == 1) {
            for (var i = 0, childNodes = rootNode.childNodes, j = childNodes.length; i < j; i++)
                findMemoNodes(childNodes[i], appendToArray);
        }
    }

    return {
        memoize: function (callback) {
            if (typeof callback != "function")
                throw new Error("You can only pass a function to ko.memoization.memoize()");
            var memoId = generateRandomId();
            memos[memoId] = callback;
            return "<!--[ko_memo:" + memoId + "]-->";
        },

        unmemoize: function (memoId, callbackParams) {
            var callback = memos[memoId];
            if (callback === undefined)
                throw new Error("Couldn't find any memo with ID " + memoId + ". Perhaps it's already been unmemoized.");
            try {
                callback.apply(null, callbackParams || []);
                return true;
            }
            finally { delete memos[memoId]; }
        },

        unmemoizeDomNodeAndDescendants: function (domNode, extraCallbackParamsArray) {
            var memos = [];
            findMemoNodes(domNode, memos);
            for (var i = 0, j = memos.length; i < j; i++) {
                var node = memos[i].domNode;
                var combinedParams = [node];
                if (extraCallbackParamsArray)
                    ko.utils.arrayPushAll(combinedParams, extraCallbackParamsArray);
                ko.memoization.unmemoize(memos[i].memoId, combinedParams);
                node.nodeValue = ""; // Neuter this node so we don't try to unmemoize it again
                if (node.parentNode)
                    node.parentNode.removeChild(node); // If possible, erase it totally (not always possible - someone else might just hold a reference to it then call unmemoizeDomNodeAndDescendants again)
            }
        },

        parseMemoText: function (memoText) {
            var match = memoText.match(/^\[ko_memo\:(.*?)\]$/);
            return match ? match[1] : null;
        }
    };
})();

ko.exportSymbol('memoization', ko.memoization);
ko.exportSymbol('memoization.memoize', ko.memoization.memoize);
ko.exportSymbol('memoization.unmemoize', ko.memoization.unmemoize);
ko.exportSymbol('memoization.parseMemoText', ko.memoization.parseMemoText);
ko.exportSymbol('memoization.unmemoizeDomNodeAndDescendants', ko.memoization.unmemoizeDomNodeAndDescendants);
ko.tasks = (function () {
    var scheduler,
        taskQueue = [],
        taskQueueLength = 0,
        nextHandle = 1,
        nextIndexToProcess = 0;

    if (window['MutationObserver']) {
        // Chrome 27+, Firefox 14+, IE 11+, Opera 15+, Safari 6.1+
        // From https://github.com/petkaantonov/bluebird * Copyright (c) 2014 Petka Antonov * License: MIT
        scheduler = (function (callback) {
            var div = document.createElement("div");
            new MutationObserver(callback).observe(div, {attributes: true});
            return function () { div.classList.toggle("foo"); };
        })(scheduledProcess);
    } else if (document && "onreadystatechange" in document.createElement("script")) {
        // IE 6-10
        // From https://github.com/YuzuJS/setImmediate * Copyright (c) 2012 Barnesandnoble.com, llc, Donavon West, and Domenic Denicola * License: MIT
        scheduler = function (callback) {
            var script = document.createElement("script");
            script.onreadystatechange = function () {
                script.onreadystatechange = null;
                document.documentElement.removeChild(script);
                script = null;
                callback();
            };
            document.documentElement.appendChild(script);
        };
    } else {
        scheduler = function (callback) {
            setTimeout(callback, 0);
        };
    }

    function processTasks() {
        if (taskQueueLength) {
            // Each mark represents the end of a logical group of tasks and the number of these groups is
            // limited to prevent unchecked recursion.
            var mark = taskQueueLength, countMarks = 0;

            // nextIndexToProcess keeps track of where we are in the queue; processTasks can be called recursively without issue
            for (var task; nextIndexToProcess < taskQueueLength; ) {
                if (task = taskQueue[nextIndexToProcess++]) {
                    if (nextIndexToProcess > mark) {
                        if (++countMarks >= 5000) {
                            nextIndexToProcess = taskQueueLength;   // skip all tasks remaining in the queue since any of them could be causing the recursion
                            ko.utils.deferError(Error("'Too much recursion' after processing " + countMarks + " task groups."));
                            break;
                        }
                        mark = taskQueueLength;
                    }
                    try {
                        task();
                    } catch (ex) {
                        ko.utils.deferError(ex);
                    }
                }
            }
        }
    }

    function scheduledProcess() {
        processTasks();

        // Reset the queue
        nextIndexToProcess = taskQueueLength = taskQueue.length = 0;
    }

    function scheduleTaskProcessing() {
        ko.tasks['scheduler'](scheduledProcess);
    }

    var tasks = {
        'scheduler': scheduler,     // Allow overriding the scheduler

        schedule: function (func) {
            if (!taskQueueLength) {
                scheduleTaskProcessing();
            }

            taskQueue[taskQueueLength++] = func;
            return nextHandle++;
        },

        cancel: function (handle) {
            var index = handle - (nextHandle - taskQueueLength);
            if (index >= nextIndexToProcess && index < taskQueueLength) {
                taskQueue[index] = null;
            }
        },

        // For testing only: reset the queue and return the previous queue length
        'resetForTesting': function () {
            var length = taskQueueLength - nextIndexToProcess;
            nextIndexToProcess = taskQueueLength = taskQueue.length = 0;
            return length;
        },

        runEarly: processTasks
    };

    return tasks;
})();

ko.exportSymbol('tasks', ko.tasks);
ko.exportSymbol('tasks.schedule', ko.tasks.schedule);
//ko.exportSymbol('tasks.cancel', ko.tasks.cancel);  "cancel" isn't minified
ko.exportSymbol('tasks.runEarly', ko.tasks.runEarly);
ko.extenders = {
    'throttle': function(target, timeout) {
        // Throttling means two things:

        // (1) For dependent observables, we throttle *evaluations* so that, no matter how fast its dependencies
        //     notify updates, the target doesn't re-evaluate (and hence doesn't notify) faster than a certain rate
        target['throttleEvaluation'] = timeout;

        // (2) For writable targets (observables, or writable dependent observables), we throttle *writes*
        //     so the target cannot change value synchronously or faster than a certain rate
        var writeTimeoutInstance = null;
        return ko.dependentObservable({
            'read': target,
            'write': function(value) {
                clearTimeout(writeTimeoutInstance);
                writeTimeoutInstance = ko.utils.setTimeout(function() {
                    target(value);
                }, timeout);
            }
        });
    },

    'rateLimit': function(target, options) {
        var timeout, method, limitFunction;

        if (typeof options == 'number') {
            timeout = options;
        } else {
            timeout = options['timeout'];
            method = options['method'];
        }

        // rateLimit supersedes deferred updates
        target._deferUpdates = false;

        limitFunction = method == 'notifyWhenChangesStop' ?  debounce : throttle;
        target.limit(function(callback) {
            return limitFunction(callback, timeout);
        });
    },

    'deferred': function(target, options) {
        if (options !== true) {
            throw new Error('The \'deferred\' extender only accepts the value \'true\', because it is not supported to turn deferral off once enabled.')
        }

        if (!target._deferUpdates) {
            target._deferUpdates = true;
            target.limit(function (callback) {
                var handle;
                return function () {
                    ko.tasks.cancel(handle);
                    handle = ko.tasks.schedule(callback);
                    target['notifySubscribers'](undefined, 'dirty');
                };
            });
        }
    },

    'notify': function(target, notifyWhen) {
        target["equalityComparer"] = notifyWhen == "always" ?
            null :  // null equalityComparer means to always notify
            valuesArePrimitiveAndEqual;
    }
};

var primitiveTypes = { 'undefined':1, 'boolean':1, 'number':1, 'string':1 };
function valuesArePrimitiveAndEqual(a, b) {
    var oldValueIsPrimitive = (a === null) || (typeof(a) in primitiveTypes);
    return oldValueIsPrimitive ? (a === b) : false;
}

function throttle(callback, timeout) {
    var timeoutInstance;
    return function () {
        if (!timeoutInstance) {
            timeoutInstance = ko.utils.setTimeout(function () {
                timeoutInstance = undefined;
                callback();
            }, timeout);
        }
    };
}

function debounce(callback, timeout) {
    var timeoutInstance;
    return function () {
        clearTimeout(timeoutInstance);
        timeoutInstance = ko.utils.setTimeout(callback, timeout);
    };
}

function applyExtenders(requestedExtenders) {
    var target = this;
    if (requestedExtenders) {
        ko.utils.objectForEach(requestedExtenders, function(key, value) {
            var extenderHandler = ko.extenders[key];
            if (typeof extenderHandler == 'function') {
                target = extenderHandler(target, value) || target;
            }
        });
    }
    return target;
}

ko.exportSymbol('extenders', ko.extenders);

ko.subscription = function (target, callback, disposeCallback) {
    this._target = target;
    this.callback = callback;
    this.disposeCallback = disposeCallback;
    this.isDisposed = false;
    ko.exportProperty(this, 'dispose', this.dispose);
};
ko.subscription.prototype.dispose = function () {
    this.isDisposed = true;
    this.disposeCallback();
};

ko.subscribable = function () {
    ko.utils.setPrototypeOfOrExtend(this, ko_subscribable_fn);
    ko_subscribable_fn.init(this);
}

var defaultEvent = "change";

// Moved out of "limit" to avoid the extra closure
function limitNotifySubscribers(value, event) {
    if (!event || event === defaultEvent) {
        this._limitChange(value);
    } else if (event === 'beforeChange') {
        this._limitBeforeChange(value);
    } else {
        this._origNotifySubscribers(value, event);
    }
}

var ko_subscribable_fn = {
    init: function(instance) {
        instance._subscriptions = {};
        instance._versionNumber = 1;
    },

    subscribe: function (callback, callbackTarget, event) {
        var self = this;

        event = event || defaultEvent;
        var boundCallback = callbackTarget ? callback.bind(callbackTarget) : callback;

        var subscription = new ko.subscription(self, boundCallback, function () {
            ko.utils.arrayRemoveItem(self._subscriptions[event], subscription);
            if (self.afterSubscriptionRemove)
                self.afterSubscriptionRemove(event);
        });

        if (self.beforeSubscriptionAdd)
            self.beforeSubscriptionAdd(event);

        if (!self._subscriptions[event])
            self._subscriptions[event] = [];
        self._subscriptions[event].push(subscription);

        return subscription;
    },

    "notifySubscribers": function (valueToNotify, event) {
        event = event || defaultEvent;
        if (event === defaultEvent) {
            this.updateVersion();
        }
        if (this.hasSubscriptionsForEvent(event)) {
            try {
                ko.dependencyDetection.begin(); // Begin suppressing dependency detection (by setting the top frame to undefined)
                for (var a = this._subscriptions[event].slice(0), i = 0, subscription; subscription = a[i]; ++i) {
                    // In case a subscription was disposed during the arrayForEach cycle, check
                    // for isDisposed on each subscription before invoking its callback
                    if (!subscription.isDisposed)
                        subscription.callback(valueToNotify);
                }
            } finally {
                ko.dependencyDetection.end(); // End suppressing dependency detection
            }
        }
    },

    getVersion: function () {
        return this._versionNumber;
    },

    hasChanged: function (versionToCheck) {
        return this.getVersion() !== versionToCheck;
    },

    updateVersion: function () {
        ++this._versionNumber;
    },

    limit: function(limitFunction) {
        var self = this, selfIsObservable = ko.isObservable(self),
            ignoreBeforeChange, previousValue, pendingValue, beforeChange = 'beforeChange';

        if (!self._origNotifySubscribers) {
            self._origNotifySubscribers = self["notifySubscribers"];
            self["notifySubscribers"] = limitNotifySubscribers;
        }

        var finish = limitFunction(function() {
            self._notificationIsPending = false;

            // If an observable provided a reference to itself, access it to get the latest value.
            // This allows computed observables to delay calculating their value until needed.
            if (selfIsObservable && pendingValue === self) {
                pendingValue = self();
            }
            ignoreBeforeChange = false;
            if (self.isDifferent(previousValue, pendingValue)) {
                self._origNotifySubscribers(previousValue = pendingValue);
            }
        });

        self._limitChange = function(value) {
            self._notificationIsPending = ignoreBeforeChange = true;
            pendingValue = value;
            finish();
        };
        self._limitBeforeChange = function(value) {
            if (!ignoreBeforeChange) {
                previousValue = value;
                self._origNotifySubscribers(value, beforeChange);
            }
        };
    },

    hasSubscriptionsForEvent: function(event) {
        return this._subscriptions[event] && this._subscriptions[event].length;
    },

    getSubscriptionsCount: function (event) {
        if (event) {
            return this._subscriptions[event] && this._subscriptions[event].length || 0;
        } else {
            var total = 0;
            ko.utils.objectForEach(this._subscriptions, function(eventName, subscriptions) {
                if (eventName !== 'dirty')
                    total += subscriptions.length;
            });
            return total;
        }
    },

    isDifferent: function(oldValue, newValue) {
        return !this['equalityComparer'] || !this['equalityComparer'](oldValue, newValue);
    },

    extend: applyExtenders
};

ko.exportProperty(ko_subscribable_fn, 'subscribe', ko_subscribable_fn.subscribe);
ko.exportProperty(ko_subscribable_fn, 'extend', ko_subscribable_fn.extend);
ko.exportProperty(ko_subscribable_fn, 'getSubscriptionsCount', ko_subscribable_fn.getSubscriptionsCount);

// For browsers that support proto assignment, we overwrite the prototype of each
// observable instance. Since observables are functions, we need Function.prototype
// to still be in the prototype chain.
if (ko.utils.canSetPrototype) {
    ko.utils.setPrototypeOf(ko_subscribable_fn, Function.prototype);
}

ko.subscribable['fn'] = ko_subscribable_fn;


ko.isSubscribable = function (instance) {
    return instance != null && typeof instance.subscribe == "function" && typeof instance["notifySubscribers"] == "function";
};

ko.exportSymbol('subscribable', ko.subscribable);
ko.exportSymbol('isSubscribable', ko.isSubscribable);

ko.computedContext = ko.dependencyDetection = (function () {
    var outerFrames = [],
        currentFrame,
        lastId = 0;

    // Return a unique ID that can be assigned to an observable for dependency tracking.
    // Theoretically, you could eventually overflow the number storage size, resulting
    // in duplicate IDs. But in JavaScript, the largest exact integral value is 2^53
    // or 9,007,199,254,740,992. If you created 1,000,000 IDs per second, it would
    // take over 285 years to reach that number.
    // Reference http://blog.vjeux.com/2010/javascript/javascript-max_int-number-limits.html
    function getId() {
        return ++lastId;
    }

    function begin(options) {
        outerFrames.push(currentFrame);
        currentFrame = options;
    }

    function end() {
        currentFrame = outerFrames.pop();
    }

    return {
        begin: begin,

        end: end,

        registerDependency: function (subscribable) {
            if (currentFrame) {
                if (!ko.isSubscribable(subscribable))
                    throw new Error("Only subscribable things can act as dependencies");
                currentFrame.callback.call(currentFrame.callbackTarget, subscribable, subscribable._id || (subscribable._id = getId()));
            }
        },

        ignore: function (callback, callbackTarget, callbackArgs) {
            try {
                begin();
                return callback.apply(callbackTarget, callbackArgs || []);
            } finally {
                end();
            }
        },

        getDependenciesCount: function () {
            if (currentFrame)
                return currentFrame.computed.getDependenciesCount();
        },

        isInitial: function() {
            if (currentFrame)
                return currentFrame.isInitial;
        }
    };
})();

ko.exportSymbol('computedContext', ko.computedContext);
ko.exportSymbol('computedContext.getDependenciesCount', ko.computedContext.getDependenciesCount);
ko.exportSymbol('computedContext.isInitial', ko.computedContext.isInitial);

ko.exportSymbol('ignoreDependencies', ko.ignoreDependencies = ko.dependencyDetection.ignore);
var observableLatestValue = ko.utils.createSymbolOrString('_latestValue');

ko.observable = function (initialValue) {
    function observable() {
        if (arguments.length > 0) {
            // Write

            // Ignore writes if the value hasn't changed
            if (observable.isDifferent(observable[observableLatestValue], arguments[0])) {
                observable.valueWillMutate();
                observable[observableLatestValue] = arguments[0];
                observable.valueHasMutated();
            }
            return this; // Permits chained assignments
        }
        else {
            // Read
            ko.dependencyDetection.registerDependency(observable); // The caller only needs to be notified of changes if they did a "read" operation
            return observable[observableLatestValue];
        }
    }

    observable[observableLatestValue] = initialValue;

    // Inherit from 'subscribable'
    if (!ko.utils.canSetPrototype) {
        // 'subscribable' won't be on the prototype chain unless we put it there directly
        ko.utils.extend(observable, ko.subscribable['fn']);
    }
    ko.subscribable['fn'].init(observable);

    // Inherit from 'observable'
    ko.utils.setPrototypeOfOrExtend(observable, observableFn);

    if (ko.options['deferUpdates']) {
        ko.extenders['deferred'](observable, true);
    }

    return observable;
}

// Define prototype for observables
var observableFn = {
    'equalityComparer': valuesArePrimitiveAndEqual,
    peek: function() { return this[observableLatestValue]; },
    valueHasMutated: function () { this['notifySubscribers'](this[observableLatestValue]); },
    valueWillMutate: function () { this['notifySubscribers'](this[observableLatestValue], 'beforeChange'); }
};

// Note that for browsers that don't support proto assignment, the
// inheritance chain is created manually in the ko.observable constructor
if (ko.utils.canSetPrototype) {
    ko.utils.setPrototypeOf(observableFn, ko.subscribable['fn']);
}

var protoProperty = ko.observable.protoProperty = '__ko_proto__';
observableFn[protoProperty] = ko.observable;

ko.hasPrototype = function(instance, prototype) {
    if ((instance === null) || (instance === undefined) || (instance[protoProperty] === undefined)) return false;
    if (instance[protoProperty] === prototype) return true;
    return ko.hasPrototype(instance[protoProperty], prototype); // Walk the prototype chain
};

ko.isObservable = function (instance) {
    return ko.hasPrototype(instance, ko.observable);
}
ko.isWriteableObservable = function (instance) {
    // Observable
    if ((typeof instance == 'function') && instance[protoProperty] === ko.observable)
        return true;
    // Writeable dependent observable
    if ((typeof instance == 'function') && (instance[protoProperty] === ko.dependentObservable) && (instance.hasWriteFunction))
        return true;
    // Anything else
    return false;
}

ko.exportSymbol('observable', ko.observable);
ko.exportSymbol('isObservable', ko.isObservable);
ko.exportSymbol('isWriteableObservable', ko.isWriteableObservable);
ko.exportSymbol('isWritableObservable', ko.isWriteableObservable);
ko.exportSymbol('observable.fn', observableFn);
ko.exportProperty(observableFn, 'peek', observableFn.peek);
ko.exportProperty(observableFn, 'valueHasMutated', observableFn.valueHasMutated);
ko.exportProperty(observableFn, 'valueWillMutate', observableFn.valueWillMutate);
ko.observableArray = function (initialValues) {
    initialValues = initialValues || [];

    if (typeof initialValues != 'object' || !('length' in initialValues))
        throw new Error("The argument passed when initializing an observable array must be an array, or null, or undefined.");

    var result = ko.observable(initialValues);
    ko.utils.setPrototypeOfOrExtend(result, ko.observableArray['fn']);
    return result.extend({'trackArrayChanges':true});
};

ko.observableArray['fn'] = {
    'remove': function (valueOrPredicate) {
        var underlyingArray = this.peek();
        var removedValues = [];
        var predicate = typeof valueOrPredicate == "function" && !ko.isObservable(valueOrPredicate) ? valueOrPredicate : function (value) { return value === valueOrPredicate; };
        for (var i = 0; i < underlyingArray.length; i++) {
            var value = underlyingArray[i];
            if (predicate(value)) {
                if (removedValues.length === 0) {
                    this.valueWillMutate();
                }
                removedValues.push(value);
                underlyingArray.splice(i, 1);
                i--;
            }
        }
        if (removedValues.length) {
            this.valueHasMutated();
        }
        return removedValues;
    },

    'removeAll': function (arrayOfValues) {
        // If you passed zero args, we remove everything
        if (arrayOfValues === undefined) {
            var underlyingArray = this.peek();
            var allValues = underlyingArray.slice(0);
            this.valueWillMutate();
            underlyingArray.splice(0, underlyingArray.length);
            this.valueHasMutated();
            return allValues;
        }
        // If you passed an arg, we interpret it as an array of entries to remove
        if (!arrayOfValues)
            return [];
        return this['remove'](function (value) {
            return ko.utils.arrayIndexOf(arrayOfValues, value) >= 0;
        });
    },

    'destroy': function (valueOrPredicate) {
        var underlyingArray = this.peek();
        var predicate = typeof valueOrPredicate == "function" && !ko.isObservable(valueOrPredicate) ? valueOrPredicate : function (value) { return value === valueOrPredicate; };
        this.valueWillMutate();
        for (var i = underlyingArray.length - 1; i >= 0; i--) {
            var value = underlyingArray[i];
            if (predicate(value))
                underlyingArray[i]["_destroy"] = true;
        }
        this.valueHasMutated();
    },

    'destroyAll': function (arrayOfValues) {
        // If you passed zero args, we destroy everything
        if (arrayOfValues === undefined)
            return this['destroy'](function() { return true });

        // If you passed an arg, we interpret it as an array of entries to destroy
        if (!arrayOfValues)
            return [];
        return this['destroy'](function (value) {
            return ko.utils.arrayIndexOf(arrayOfValues, value) >= 0;
        });
    },

    'indexOf': function (item) {
        var underlyingArray = this();
        return ko.utils.arrayIndexOf(underlyingArray, item);
    },

    'replace': function(oldItem, newItem) {
        var index = this['indexOf'](oldItem);
        if (index >= 0) {
            this.valueWillMutate();
            this.peek()[index] = newItem;
            this.valueHasMutated();
        }
    }
};

// Note that for browsers that don't support proto assignment, the
// inheritance chain is created manually in the ko.observableArray constructor
if (ko.utils.canSetPrototype) {
    ko.utils.setPrototypeOf(ko.observableArray['fn'], ko.observable['fn']);
}

// Populate ko.observableArray.fn with read/write functions from native arrays
// Important: Do not add any additional functions here that may reasonably be used to *read* data from the array
// because we'll eval them without causing subscriptions, so ko.computed output could end up getting stale
ko.utils.arrayForEach(["pop", "push", "reverse", "shift", "sort", "splice", "unshift"], function (methodName) {
    ko.observableArray['fn'][methodName] = function () {
        // Use "peek" to avoid creating a subscription in any computed that we're executing in the context of
        // (for consistency with mutating regular observables)
        var underlyingArray = this.peek();
        this.valueWillMutate();
        this.cacheDiffForKnownOperation(underlyingArray, methodName, arguments);
        var methodCallResult = underlyingArray[methodName].apply(underlyingArray, arguments);
        this.valueHasMutated();
        // The native sort and reverse methods return a reference to the array, but it makes more sense to return the observable array instead.
        return methodCallResult === underlyingArray ? this : methodCallResult;
    };
});

// Populate ko.observableArray.fn with read-only functions from native arrays
ko.utils.arrayForEach(["slice"], function (methodName) {
    ko.observableArray['fn'][methodName] = function () {
        var underlyingArray = this();
        return underlyingArray[methodName].apply(underlyingArray, arguments);
    };
});

ko.exportSymbol('observableArray', ko.observableArray);
var arrayChangeEventName = 'arrayChange';
ko.extenders['trackArrayChanges'] = function(target, options) {
    // Use the provided options--each call to trackArrayChanges overwrites the previously set options
    target.compareArrayOptions = {};
    if (options && typeof options == "object") {
        ko.utils.extend(target.compareArrayOptions, options);
    }
    target.compareArrayOptions['sparse'] = true;

    // Only modify the target observable once
    if (target.cacheDiffForKnownOperation) {
        return;
    }
    var trackingChanges = false,
        cachedDiff = null,
        arrayChangeSubscription,
        pendingNotifications = 0,
        underlyingBeforeSubscriptionAddFunction = target.beforeSubscriptionAdd,
        underlyingAfterSubscriptionRemoveFunction = target.afterSubscriptionRemove;

    // Watch "subscribe" calls, and for array change events, ensure change tracking is enabled
    target.beforeSubscriptionAdd = function (event) {
        if (underlyingBeforeSubscriptionAddFunction)
            underlyingBeforeSubscriptionAddFunction.call(target, event);
        if (event === arrayChangeEventName) {
            trackChanges();
        }
    };
    // Watch "dispose" calls, and for array change events, ensure change tracking is disabled when all are disposed
    target.afterSubscriptionRemove = function (event) {
        if (underlyingAfterSubscriptionRemoveFunction)
            underlyingAfterSubscriptionRemoveFunction.call(target, event);
        if (event === arrayChangeEventName && !target.hasSubscriptionsForEvent(arrayChangeEventName)) {
            arrayChangeSubscription.dispose();
            trackingChanges = false;
        }
    };

    function trackChanges() {
        // Calling 'trackChanges' multiple times is the same as calling it once
        if (trackingChanges) {
            return;
        }

        trackingChanges = true;

        // Intercept "notifySubscribers" to track how many times it was called.
        var underlyingNotifySubscribersFunction = target['notifySubscribers'];
        target['notifySubscribers'] = function(valueToNotify, event) {
            if (!event || event === defaultEvent) {
                ++pendingNotifications;
            }
            return underlyingNotifySubscribersFunction.apply(this, arguments);
        };

        // Each time the array changes value, capture a clone so that on the next
        // change it's possible to produce a diff
        var previousContents = [].concat(target.peek() || []);
        cachedDiff = null;
        arrayChangeSubscription = target.subscribe(function(currentContents) {
            // Make a copy of the current contents and ensure it's an array
            currentContents = [].concat(currentContents || []);

            // Compute the diff and issue notifications, but only if someone is listening
            if (target.hasSubscriptionsForEvent(arrayChangeEventName)) {
                var changes = getChanges(previousContents, currentContents);
            }

            // Eliminate references to the old, removed items, so they can be GCed
            previousContents = currentContents;
            cachedDiff = null;
            pendingNotifications = 0;

            if (changes && changes.length) {
                target['notifySubscribers'](changes, arrayChangeEventName);
            }
        });
    }

    function getChanges(previousContents, currentContents) {
        // We try to re-use cached diffs.
        // The scenarios where pendingNotifications > 1 are when using rate-limiting or the Deferred Updates
        // plugin, which without this check would not be compatible with arrayChange notifications. Normally,
        // notifications are issued immediately so we wouldn't be queueing up more than one.
        if (!cachedDiff || pendingNotifications > 1) {
            cachedDiff = ko.utils.compareArrays(previousContents, currentContents, target.compareArrayOptions);
        }

        return cachedDiff;
    }

    target.cacheDiffForKnownOperation = function(rawArray, operationName, args) {
        // Only run if we're currently tracking changes for this observable array
        // and there aren't any pending deferred notifications.
        if (!trackingChanges || pendingNotifications) {
            return;
        }
        var diff = [],
            arrayLength = rawArray.length,
            argsLength = args.length,
            offset = 0;

        function pushDiff(status, value, index) {
            return diff[diff.length] = { 'status': status, 'value': value, 'index': index };
        }
        switch (operationName) {
            case 'push':
                offset = arrayLength;
            case 'unshift':
                for (var index = 0; index < argsLength; index++) {
                    pushDiff('added', args[index], offset + index);
                }
                break;

            case 'pop':
                offset = arrayLength - 1;
            case 'shift':
                if (arrayLength) {
                    pushDiff('deleted', rawArray[offset], offset);
                }
                break;

            case 'splice':
                // Negative start index means 'from end of array'. After that we clamp to [0...arrayLength].
                // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice
                var startIndex = Math.min(Math.max(0, args[0] < 0 ? arrayLength + args[0] : args[0]), arrayLength),
                    endDeleteIndex = argsLength === 1 ? arrayLength : Math.min(startIndex + (args[1] || 0), arrayLength),
                    endAddIndex = startIndex + argsLength - 2,
                    endIndex = Math.max(endDeleteIndex, endAddIndex),
                    additions = [], deletions = [];
                for (var index = startIndex, argsIndex = 2; index < endIndex; ++index, ++argsIndex) {
                    if (index < endDeleteIndex)
                        deletions.push(pushDiff('deleted', rawArray[index], index));
                    if (index < endAddIndex)
                        additions.push(pushDiff('added', args[argsIndex], index));
                }
                ko.utils.findMovesInArrayComparison(deletions, additions);
                break;

            default:
                return;
        }
        cachedDiff = diff;
    };
};
var computedState = ko.utils.createSymbolOrString('_state');

ko.computed = ko.dependentObservable = function (evaluatorFunctionOrOptions, evaluatorFunctionTarget, options) {
    if (typeof evaluatorFunctionOrOptions === "object") {
        // Single-parameter syntax - everything is on this "options" param
        options = evaluatorFunctionOrOptions;
    } else {
        // Multi-parameter syntax - construct the options according to the params passed
        options = options || {};
        if (evaluatorFunctionOrOptions) {
            options["read"] = evaluatorFunctionOrOptions;
        }
    }
    if (typeof options["read"] != "function")
        throw Error("Pass a function that returns the value of the ko.computed");

    var writeFunction = options["write"];
    var state = {
        latestValue: undefined,
        isStale: true,
        isBeingEvaluated: false,
        suppressDisposalUntilDisposeWhenReturnsFalse: false,
        isDisposed: false,
        pure: false,
        isSleeping: false,
        readFunction: options["read"],
        evaluatorFunctionTarget: evaluatorFunctionTarget || options["owner"],
        disposeWhenNodeIsRemoved: options["disposeWhenNodeIsRemoved"] || options.disposeWhenNodeIsRemoved || null,
        disposeWhen: options["disposeWhen"] || options.disposeWhen,
        domNodeDisposalCallback: null,
        dependencyTracking: {},
        dependenciesCount: 0,
        evaluationTimeoutInstance: null
    };

    function computedObservable() {
        if (arguments.length > 0) {
            if (typeof writeFunction === "function") {
                // Writing a value
                writeFunction.apply(state.evaluatorFunctionTarget, arguments);
            } else {
                throw new Error("Cannot write a value to a ko.computed unless you specify a 'write' option. If you wish to read the current value, don't pass any parameters.");
            }
            return this; // Permits chained assignments
        } else {
            // Reading the value
            ko.dependencyDetection.registerDependency(computedObservable);
            if (state.isStale || (state.isSleeping && computedObservable.haveDependenciesChanged())) {
                computedObservable.evaluateImmediate();
            }
            return state.latestValue;
        }
    }

    computedObservable[computedState] = state;
    computedObservable.hasWriteFunction = typeof writeFunction === "function";

    // Inherit from 'subscribable'
    if (!ko.utils.canSetPrototype) {
        // 'subscribable' won't be on the prototype chain unless we put it there directly
        ko.utils.extend(computedObservable, ko.subscribable['fn']);
    }
    ko.subscribable['fn'].init(computedObservable);

    // Inherit from 'computed'
    ko.utils.setPrototypeOfOrExtend(computedObservable, computedFn);

    if (options['pure']) {
        state.pure = true;
        state.isSleeping = true;     // Starts off sleeping; will awake on the first subscription
        ko.utils.extend(computedObservable, pureComputedOverrides);
    } else if (options['deferEvaluation']) {
        ko.utils.extend(computedObservable, deferEvaluationOverrides);
    }

    if (ko.options['deferUpdates']) {
        ko.extenders['deferred'](computedObservable, true);
    }

    if (DEBUG) {
        // #1731 - Aid debugging by exposing the computed's options
        computedObservable["_options"] = options;
    }

    if (state.disposeWhenNodeIsRemoved) {
        // Since this computed is associated with a DOM node, and we don't want to dispose the computed
        // until the DOM node is *removed* from the document (as opposed to never having been in the document),
        // we'll prevent disposal until "disposeWhen" first returns false.
        state.suppressDisposalUntilDisposeWhenReturnsFalse = true;

        // disposeWhenNodeIsRemoved: true can be used to opt into the "only dispose after first false result"
        // behaviour even if there's no specific node to watch. In that case, clear the option so we don't try
        // to watch for a non-node's disposal. This technique is intended for KO's internal use only and shouldn't
        // be documented or used by application code, as it's likely to change in a future version of KO.
        if (!state.disposeWhenNodeIsRemoved.nodeType) {
            state.disposeWhenNodeIsRemoved = null;
        }
    }

    // Evaluate, unless sleeping or deferEvaluation is true
    if (!state.isSleeping && !options['deferEvaluation']) {
        computedObservable.evaluateImmediate();
    }

    // Attach a DOM node disposal callback so that the computed will be proactively disposed as soon as the node is
    // removed using ko.removeNode. But skip if isActive is false (there will never be any dependencies to dispose).
    if (state.disposeWhenNodeIsRemoved && computedObservable.isActive()) {
        ko.utils.domNodeDisposal.addDisposeCallback(state.disposeWhenNodeIsRemoved, state.domNodeDisposalCallback = function () {
            computedObservable.dispose();
        });
    }

    return computedObservable;
};

// Utility function that disposes a given dependencyTracking entry
function computedDisposeDependencyCallback(id, entryToDispose) {
    if (entryToDispose !== null && entryToDispose.dispose) {
        entryToDispose.dispose();
    }
}

// This function gets called each time a dependency is detected while evaluating a computed.
// It's factored out as a shared function to avoid creating unnecessary function instances during evaluation.
function computedBeginDependencyDetectionCallback(subscribable, id) {
    var computedObservable = this.computedObservable,
        state = computedObservable[computedState];
    if (!state.isDisposed) {
        if (this.disposalCount && this.disposalCandidates[id]) {
            // Don't want to dispose this subscription, as it's still being used
            computedObservable.addDependencyTracking(id, subscribable, this.disposalCandidates[id]);
            this.disposalCandidates[id] = null; // No need to actually delete the property - disposalCandidates is a transient object anyway
            --this.disposalCount;
        } else if (!state.dependencyTracking[id]) {
            // Brand new subscription - add it
            computedObservable.addDependencyTracking(id, subscribable, state.isSleeping ? { _target: subscribable } : computedObservable.subscribeToDependency(subscribable));
        }
    }
}

var computedFn = {
    "equalityComparer": valuesArePrimitiveAndEqual,
    getDependenciesCount: function () {
        return this[computedState].dependenciesCount;
    },
    addDependencyTracking: function (id, target, trackingObj) {
        if (this[computedState].pure && target === this) {
            throw Error("A 'pure' computed must not be called recursively");
        }

        this[computedState].dependencyTracking[id] = trackingObj;
        trackingObj._order = this[computedState].dependenciesCount++;
        trackingObj._version = target.getVersion();
    },
    haveDependenciesChanged: function () {
        var id, dependency, dependencyTracking = this[computedState].dependencyTracking;
        for (id in dependencyTracking) {
            if (dependencyTracking.hasOwnProperty(id)) {
                dependency = dependencyTracking[id];
                if (dependency._target.hasChanged(dependency._version)) {
                    return true;
                }
            }
        }
    },
    markDirty: function () {
        // Process "dirty" events if we can handle delayed notifications
        if (this._evalDelayed && !this[computedState].isBeingEvaluated) {
            this._evalDelayed();
        }
    },
    isActive: function () {
        return this[computedState].isStale || this[computedState].dependenciesCount > 0;
    },
    respondToChange: function () {
        // Ignore "change" events if we've already scheduled a delayed notification
        if (!this._notificationIsPending) {
            this.evaluatePossiblyAsync();
        }
    },
    subscribeToDependency: function (target) {
        if (target._deferUpdates && !this[computedState].disposeWhenNodeIsRemoved) {
            var dirtySub = target.subscribe(this.markDirty, this, 'dirty'),
                changeSub = target.subscribe(this.respondToChange, this);
            return {
                _target: target,
                dispose: function () {
                    dirtySub.dispose();
                    changeSub.dispose();
                }
            };
        } else {
            return target.subscribe(this.evaluatePossiblyAsync, this);
        }
    },
    evaluatePossiblyAsync: function () {
        var computedObservable = this,
            throttleEvaluationTimeout = computedObservable['throttleEvaluation'];
        if (throttleEvaluationTimeout && throttleEvaluationTimeout >= 0) {
            clearTimeout(this[computedState].evaluationTimeoutInstance);
            this[computedState].evaluationTimeoutInstance = ko.utils.setTimeout(function () {
                computedObservable.evaluateImmediate(true /*notifyChange*/);
            }, throttleEvaluationTimeout);
        } else if (computedObservable._evalDelayed) {
            computedObservable._evalDelayed();
        } else {
            computedObservable.evaluateImmediate(true /*notifyChange*/);
        }
    },
    evaluateImmediate: function (notifyChange) {
        var computedObservable = this,
            state = computedObservable[computedState],
            disposeWhen = state.disposeWhen;

        if (state.isBeingEvaluated) {
            // If the evaluation of a ko.computed causes side effects, it's possible that it will trigger its own re-evaluation.
            // This is not desirable (it's hard for a developer to realise a chain of dependencies might cause this, and they almost
            // certainly didn't intend infinite re-evaluations). So, for predictability, we simply prevent ko.computeds from causing
            // their own re-evaluation. Further discussion at https://github.com/SteveSanderson/knockout/pull/387
            return;
        }

        // Do not evaluate (and possibly capture new dependencies) if disposed
        if (state.isDisposed) {
            return;
        }

        if (state.disposeWhenNodeIsRemoved && !ko.utils.domNodeIsAttachedToDocument(state.disposeWhenNodeIsRemoved) || disposeWhen && disposeWhen()) {
            // See comment above about suppressDisposalUntilDisposeWhenReturnsFalse
            if (!state.suppressDisposalUntilDisposeWhenReturnsFalse) {
                computedObservable.dispose();
                return;
            }
        } else {
            // It just did return false, so we can stop suppressing now
            state.suppressDisposalUntilDisposeWhenReturnsFalse = false;
        }

        state.isBeingEvaluated = true;
        try {
            this.evaluateImmediate_CallReadWithDependencyDetection(notifyChange);
        } finally {
            state.isBeingEvaluated = false;
        }

        if (!state.dependenciesCount) {
            computedObservable.dispose();
        }
    },
    evaluateImmediate_CallReadWithDependencyDetection: function (notifyChange) {
        // This function is really just part of the evaluateImmediate logic. You would never call it from anywhere else.
        // Factoring it out into a separate function means it can be independent of the try/catch block in evaluateImmediate,
        // which contributes to saving about 40% off the CPU overhead of computed evaluation (on V8 at least).

        var computedObservable = this,
            state = computedObservable[computedState];

        // Initially, we assume that none of the subscriptions are still being used (i.e., all are candidates for disposal).
        // Then, during evaluation, we cross off any that are in fact still being used.
        var isInitial = state.pure ? undefined : !state.dependenciesCount,   // If we're evaluating when there are no previous dependencies, it must be the first time
            dependencyDetectionContext = {
                computedObservable: computedObservable,
                disposalCandidates: state.dependencyTracking,
                disposalCount: state.dependenciesCount
            };

        ko.dependencyDetection.begin({
            callbackTarget: dependencyDetectionContext,
            callback: computedBeginDependencyDetectionCallback,
            computed: computedObservable,
            isInitial: isInitial
        });

        state.dependencyTracking = {};
        state.dependenciesCount = 0;

        var newValue = this.evaluateImmediate_CallReadThenEndDependencyDetection(state, dependencyDetectionContext);

        if (computedObservable.isDifferent(state.latestValue, newValue)) {
            if (!state.isSleeping) {
                computedObservable["notifySubscribers"](state.latestValue, "beforeChange");
            }

            state.latestValue = newValue;

            if (state.isSleeping) {
                computedObservable.updateVersion();
            } else if (notifyChange) {
                computedObservable["notifySubscribers"](state.latestValue);
            }
        }

        if (isInitial) {
            computedObservable["notifySubscribers"](state.latestValue, "awake");
        }
    },
    evaluateImmediate_CallReadThenEndDependencyDetection: function (state, dependencyDetectionContext) {
        // This function is really part of the evaluateImmediate_CallReadWithDependencyDetection logic.
        // You'd never call it from anywhere else. Factoring it out means that evaluateImmediate_CallReadWithDependencyDetection
        // can be independent of try/finally blocks, which contributes to saving about 40% off the CPU
        // overhead of computed evaluation (on V8 at least).

        try {
            var readFunction = state.readFunction;
            return state.evaluatorFunctionTarget ? readFunction.call(state.evaluatorFunctionTarget) : readFunction();
        } finally {
            ko.dependencyDetection.end();

            // For each subscription no longer being used, remove it from the active subscriptions list and dispose it
            if (dependencyDetectionContext.disposalCount && !state.isSleeping) {
                ko.utils.objectForEach(dependencyDetectionContext.disposalCandidates, computedDisposeDependencyCallback);
            }

            state.isStale = false;
        }
    },
    peek: function () {
        // Peek won't re-evaluate, except while the computed is sleeping or to get the initial value when "deferEvaluation" is set.
        var state = this[computedState];
        if ((state.isStale && !state.dependenciesCount) || (state.isSleeping && this.haveDependenciesChanged())) {
            this.evaluateImmediate();
        }
        return state.latestValue;
    },
    limit: function (limitFunction) {
        // Override the limit function with one that delays evaluation as well
        ko.subscribable['fn'].limit.call(this, limitFunction);
        this._evalDelayed = function () {
            this._limitBeforeChange(this[computedState].latestValue);

            this[computedState].isStale = true; // Mark as dirty

            // Pass the observable to the "limit" code, which will access it when
            // it's time to do the notification.
            this._limitChange(this);
        }
    },
    dispose: function () {
        var state = this[computedState];
        if (!state.isSleeping && state.dependencyTracking) {
            ko.utils.objectForEach(state.dependencyTracking, function (id, dependency) {
                if (dependency.dispose)
                    dependency.dispose();
            });
        }
        if (state.disposeWhenNodeIsRemoved && state.domNodeDisposalCallback) {
            ko.utils.domNodeDisposal.removeDisposeCallback(state.disposeWhenNodeIsRemoved, state.domNodeDisposalCallback);
        }
        state.dependencyTracking = null;
        state.dependenciesCount = 0;
        state.isDisposed = true;
        state.isStale = false;
        state.isSleeping = false;
        state.disposeWhenNodeIsRemoved = null;
    }
};

var pureComputedOverrides = {
    beforeSubscriptionAdd: function (event) {
        // If asleep, wake up the computed by subscribing to any dependencies.
        var computedObservable = this,
            state = computedObservable[computedState];
        if (!state.isDisposed && state.isSleeping && event == 'change') {
            state.isSleeping = false;
            if (state.isStale || computedObservable.haveDependenciesChanged()) {
                state.dependencyTracking = null;
                state.dependenciesCount = 0;
                state.isStale = true;
                computedObservable.evaluateImmediate();
            } else {
                // First put the dependencies in order
                var dependeciesOrder = [];
                ko.utils.objectForEach(state.dependencyTracking, function (id, dependency) {
                    dependeciesOrder[dependency._order] = id;
                });
                // Next, subscribe to each one
                ko.utils.arrayForEach(dependeciesOrder, function (id, order) {
                    var dependency = state.dependencyTracking[id],
                        subscription = computedObservable.subscribeToDependency(dependency._target);
                    subscription._order = order;
                    subscription._version = dependency._version;
                    state.dependencyTracking[id] = subscription;
                });
            }
            if (!state.isDisposed) {     // test since evaluating could trigger disposal
                computedObservable["notifySubscribers"](state.latestValue, "awake");
            }
        }
    },
    afterSubscriptionRemove: function (event) {
        var state = this[computedState];
        if (!state.isDisposed && event == 'change' && !this.hasSubscriptionsForEvent('change')) {
            ko.utils.objectForEach(state.dependencyTracking, function (id, dependency) {
                if (dependency.dispose) {
                    state.dependencyTracking[id] = {
                        _target: dependency._target,
                        _order: dependency._order,
                        _version: dependency._version
                    };
                    dependency.dispose();
                }
            });
            state.isSleeping = true;
            this["notifySubscribers"](undefined, "asleep");
        }
    },
    getVersion: function () {
        // Because a pure computed is not automatically updated while it is sleeping, we can't
        // simply return the version number. Instead, we check if any of the dependencies have
        // changed and conditionally re-evaluate the computed observable.
        var state = this[computedState];
        if (state.isSleeping && (state.isStale || this.haveDependenciesChanged())) {
            this.evaluateImmediate();
        }
        return ko.subscribable['fn'].getVersion.call(this);
    }
};

var deferEvaluationOverrides = {
    beforeSubscriptionAdd: function (event) {
        // This will force a computed with deferEvaluation to evaluate when the first subscription is registered.
        if (event == 'change' || event == 'beforeChange') {
            this.peek();
        }
    }
};

// Note that for browsers that don't support proto assignment, the
// inheritance chain is created manually in the ko.computed constructor
if (ko.utils.canSetPrototype) {
    ko.utils.setPrototypeOf(computedFn, ko.subscribable['fn']);
}

// Set the proto chain values for ko.hasPrototype
var protoProp = ko.observable.protoProperty; // == "__ko_proto__"
ko.computed[protoProp] = ko.observable;
computedFn[protoProp] = ko.computed;

ko.isComputed = function (instance) {
    return ko.hasPrototype(instance, ko.computed);
};

ko.isPureComputed = function (instance) {
    return ko.hasPrototype(instance, ko.computed)
        && instance[computedState] && instance[computedState].pure;
};

ko.exportSymbol('computed', ko.computed);
ko.exportSymbol('dependentObservable', ko.computed);    // export ko.dependentObservable for backwards compatibility (1.x)
ko.exportSymbol('isComputed', ko.isComputed);
ko.exportSymbol('isPureComputed', ko.isPureComputed);
ko.exportSymbol('computed.fn', computedFn);
ko.exportProperty(computedFn, 'peek', computedFn.peek);
ko.exportProperty(computedFn, 'dispose', computedFn.dispose);
ko.exportProperty(computedFn, 'isActive', computedFn.isActive);
ko.exportProperty(computedFn, 'getDependenciesCount', computedFn.getDependenciesCount);

ko.pureComputed = function (evaluatorFunctionOrOptions, evaluatorFunctionTarget) {
    if (typeof evaluatorFunctionOrOptions === 'function') {
        return ko.computed(evaluatorFunctionOrOptions, evaluatorFunctionTarget, {'pure':true});
    } else {
        evaluatorFunctionOrOptions = ko.utils.extend({}, evaluatorFunctionOrOptions);   // make a copy of the parameter object
        evaluatorFunctionOrOptions['pure'] = true;
        return ko.computed(evaluatorFunctionOrOptions, evaluatorFunctionTarget);
    }
}
ko.exportSymbol('pureComputed', ko.pureComputed);

(function() {
    var maxNestedObservableDepth = 10; // Escape the (unlikely) pathalogical case where an observable's current value is itself (or similar reference cycle)

    ko.toJS = function(rootObject) {
        if (arguments.length == 0)
            throw new Error("When calling ko.toJS, pass the object you want to convert.");

        // We just unwrap everything at every level in the object graph
        return mapJsObjectGraph(rootObject, function(valueToMap) {
            // Loop because an observable's value might in turn be another observable wrapper
            for (var i = 0; ko.isObservable(valueToMap) && (i < maxNestedObservableDepth); i++)
                valueToMap = valueToMap();
            return valueToMap;
        });
    };

    ko.toJSON = function(rootObject, replacer, space) {     // replacer and space are optional
        var plainJavaScriptObject = ko.toJS(rootObject);
        return ko.utils.stringifyJson(plainJavaScriptObject, replacer, space);
    };

    function mapJsObjectGraph(rootObject, mapInputCallback, visitedObjects) {
        visitedObjects = visitedObjects || new objectLookup();

        rootObject = mapInputCallback(rootObject);
        var canHaveProperties = (typeof rootObject == "object") && (rootObject !== null) && (rootObject !== undefined) && (!(rootObject instanceof RegExp)) && (!(rootObject instanceof Date)) && (!(rootObject instanceof String)) && (!(rootObject instanceof Number)) && (!(rootObject instanceof Boolean));
        if (!canHaveProperties)
            return rootObject;

        var outputProperties = rootObject instanceof Array ? [] : {};
        visitedObjects.save(rootObject, outputProperties);

        visitPropertiesOrArrayEntries(rootObject, function(indexer) {
            var propertyValue = mapInputCallback(rootObject[indexer]);

            switch (typeof propertyValue) {
                case "boolean":
                case "number":
                case "string":
                case "function":
                    outputProperties[indexer] = propertyValue;
                    break;
                case "object":
                case "undefined":
                    var previouslyMappedValue = visitedObjects.get(propertyValue);
                    outputProperties[indexer] = (previouslyMappedValue !== undefined)
                        ? previouslyMappedValue
                        : mapJsObjectGraph(propertyValue, mapInputCallback, visitedObjects);
                    break;
            }
        });

        return outputProperties;
    }

    function visitPropertiesOrArrayEntries(rootObject, visitorCallback) {
        if (rootObject instanceof Array) {
            for (var i = 0; i < rootObject.length; i++)
                visitorCallback(i);

            // For arrays, also respect toJSON property for custom mappings (fixes #278)
            if (typeof rootObject['toJSON'] == 'function')
                visitorCallback('toJSON');
        } else {
            for (var propertyName in rootObject) {
                visitorCallback(propertyName);
            }
        }
    };

    function objectLookup() {
        this.keys = [];
        this.values = [];
    };

    objectLookup.prototype = {
        constructor: objectLookup,
        save: function(key, value) {
            var existingIndex = ko.utils.arrayIndexOf(this.keys, key);
            if (existingIndex >= 0)
                this.values[existingIndex] = value;
            else {
                this.keys.push(key);
                this.values.push(value);
            }
        },
        get: function(key) {
            var existingIndex = ko.utils.arrayIndexOf(this.keys, key);
            return (existingIndex >= 0) ? this.values[existingIndex] : undefined;
        }
    };
})();

ko.exportSymbol('toJS', ko.toJS);
ko.exportSymbol('toJSON', ko.toJSON);
(function () {
    var hasDomDataExpandoProperty = '__ko__hasDomDataOptionValue__';

    // Normally, SELECT elements and their OPTIONs can only take value of type 'string' (because the values
    // are stored on DOM attributes). ko.selectExtensions provides a way for SELECTs/OPTIONs to have values
    // that are arbitrary objects. This is very convenient when implementing things like cascading dropdowns.
    ko.selectExtensions = {
        readValue : function(element) {
            switch (ko.utils.tagNameLower(element)) {
                case 'option':
                    if (element[hasDomDataExpandoProperty] === true)
                        return ko.utils.domData.get(element, ko.bindingHandlers.options.optionValueDomDataKey);
                    return ko.utils.ieVersion <= 7
                        ? (element.getAttributeNode('value') && element.getAttributeNode('value').specified ? element.value : element.text)
                        : element.value;
                case 'select':
                    return element.selectedIndex >= 0 ? ko.selectExtensions.readValue(element.options[element.selectedIndex]) : undefined;
                default:
                    return element.value;
            }
        },

        writeValue: function(element, value, allowUnset) {
            switch (ko.utils.tagNameLower(element)) {
                case 'option':
                    switch(typeof value) {
                        case "string":
                            ko.utils.domData.set(element, ko.bindingHandlers.options.optionValueDomDataKey, undefined);
                            if (hasDomDataExpandoProperty in element) { // IE <= 8 throws errors if you delete non-existent properties from a DOM node
                                delete element[hasDomDataExpandoProperty];
                            }
                            element.value = value;
                            break;
                        default:
                            // Store arbitrary object using DomData
                            ko.utils.domData.set(element, ko.bindingHandlers.options.optionValueDomDataKey, value);
                            element[hasDomDataExpandoProperty] = true;

                            // Special treatment of numbers is just for backward compatibility. KO 1.2.1 wrote numerical values to element.value.
                            element.value = typeof value === "number" ? value : "";
                            break;
                    }
                    break;
                case 'select':
                    if (value === "" || value === null)       // A blank string or null value will select the caption
                        value = undefined;
                    var selection = -1;
                    for (var i = 0, n = element.options.length, optionValue; i < n; ++i) {
                        optionValue = ko.selectExtensions.readValue(element.options[i]);
                        // Include special check to handle selecting a caption with a blank string value
                        if (optionValue == value || (optionValue == "" && value === undefined)) {
                            selection = i;
                            break;
                        }
                    }
                    if (allowUnset || selection >= 0 || (value === undefined && element.size > 1)) {
                        element.selectedIndex = selection;
                    }
                    break;
                default:
                    if ((value === null) || (value === undefined))
                        value = "";
                    element.value = value;
                    break;
            }
        }
    };
})();

ko.exportSymbol('selectExtensions', ko.selectExtensions);
ko.exportSymbol('selectExtensions.readValue', ko.selectExtensions.readValue);
ko.exportSymbol('selectExtensions.writeValue', ko.selectExtensions.writeValue);
ko.expressionRewriting = (function () {
    var javaScriptReservedWords = ["true", "false", "null", "undefined"];

    // Matches something that can be assigned to--either an isolated identifier or something ending with a property accessor
    // This is designed to be simple and avoid false negatives, but could produce false positives (e.g., a+b.c).
    // This also will not properly handle nested brackets (e.g., obj1[obj2['prop']]; see #911).
    var javaScriptAssignmentTarget = /^(?:[$_a-z][$\w]*|(.+)(\.\s*[$_a-z][$\w]*|\[.+\]))$/i;

    function getWriteableValue(expression) {
        if (ko.utils.arrayIndexOf(javaScriptReservedWords, expression) >= 0)
            return false;
        var match = expression.match(javaScriptAssignmentTarget);
        return match === null ? false : match[1] ? ('Object(' + match[1] + ')' + match[2]) : expression;
    }

    // The following regular expressions will be used to split an object-literal string into tokens

        // These two match strings, either with double quotes or single quotes
    var stringDouble = '"(?:[^"\\\\]|\\\\.)*"',
        stringSingle = "'(?:[^'\\\\]|\\\\.)*'",
        // Matches a regular expression (text enclosed by slashes), but will also match sets of divisions
        // as a regular expression (this is handled by the parsing loop below).
        stringRegexp = '/(?:[^/\\\\]|\\\\.)*/\w*',
        // These characters have special meaning to the parser and must not appear in the middle of a
        // token, except as part of a string.
        specials = ',"\'{}()/:[\\]',
        // Match text (at least two characters) that does not contain any of the above special characters,
        // although some of the special characters are allowed to start it (all but the colon and comma).
        // The text can contain spaces, but leading or trailing spaces are skipped.
        everyThingElse = '[^\\s:,/][^' + specials + ']*[^\\s' + specials + ']',
        // Match any non-space character not matched already. This will match colons and commas, since they're
        // not matched by "everyThingElse", but will also match any other single character that wasn't already
        // matched (for example: in "a: 1, b: 2", each of the non-space characters will be matched by oneNotSpace).
        oneNotSpace = '[^\\s]',

        // Create the actual regular expression by or-ing the above strings. The order is important.
        bindingToken = RegExp(stringDouble + '|' + stringSingle + '|' + stringRegexp + '|' + everyThingElse + '|' + oneNotSpace, 'g'),

        // Match end of previous token to determine whether a slash is a division or regex.
        divisionLookBehind = /[\])"'A-Za-z0-9_$]+$/,
        keywordRegexLookBehind = {'in':1,'return':1,'typeof':1};

    function parseObjectLiteral(objectLiteralString) {
        // Trim leading and trailing spaces from the string
        var str = ko.utils.stringTrim(objectLiteralString);

        // Trim braces '{' surrounding the whole object literal
        if (str.charCodeAt(0) === 123) str = str.slice(1, -1);

        // Split into tokens
        var result = [], toks = str.match(bindingToken), key, values = [], depth = 0;

        if (toks) {
            // Append a comma so that we don't need a separate code block to deal with the last item
            toks.push(',');

            for (var i = 0, tok; tok = toks[i]; ++i) {
                var c = tok.charCodeAt(0);
                // A comma signals the end of a key/value pair if depth is zero
                if (c === 44) { // ","
                    if (depth <= 0) {
                        result.push((key && values.length) ? {key: key, value: values.join('')} : {'unknown': key || values.join('')});
                        key = depth = 0;
                        values = [];
                        continue;
                    }
                // Simply skip the colon that separates the name and value
                } else if (c === 58) { // ":"
                    if (!depth && !key && values.length === 1) {
                        key = values.pop();
                        continue;
                    }
                // A set of slashes is initially matched as a regular expression, but could be division
                } else if (c === 47 && i && tok.length > 1) {  // "/"
                    // Look at the end of the previous token to determine if the slash is actually division
                    var match = toks[i-1].match(divisionLookBehind);
                    if (match && !keywordRegexLookBehind[match[0]]) {
                        // The slash is actually a division punctuator; re-parse the remainder of the string (not including the slash)
                        str = str.substr(str.indexOf(tok) + 1);
                        toks = str.match(bindingToken);
                        toks.push(',');
                        i = -1;
                        // Continue with just the slash
                        tok = '/';
                    }
                // Increment depth for parentheses, braces, and brackets so that interior commas are ignored
                } else if (c === 40 || c === 123 || c === 91) { // '(', '{', '['
                    ++depth;
                } else if (c === 41 || c === 125 || c === 93) { // ')', '}', ']'
                    --depth;
                // The key will be the first token; if it's a string, trim the quotes
                } else if (!key && !values.length && (c === 34 || c === 39)) { // '"', "'"
                    tok = tok.slice(1, -1);
                }
                values.push(tok);
            }
        }
        return result;
    }

    // Two-way bindings include a write function that allow the handler to update the value even if it's not an observable.
    var twoWayBindings = {};

    function preProcessBindings(bindingsStringOrKeyValueArray, bindingOptions) {
        bindingOptions = bindingOptions || {};

        function processKeyValue(key, val) {
            var writableVal;
            function callPreprocessHook(obj) {
                return (obj && obj['preprocess']) ? (val = obj['preprocess'](val, key, processKeyValue)) : true;
            }
            if (!bindingParams) {
                if (!callPreprocessHook(ko['getBindingHandler'](key)))
                    return;

                if (twoWayBindings[key] && (writableVal = getWriteableValue(val))) {
                    // For two-way bindings, provide a write method in case the value
                    // isn't a writable observable.
                    propertyAccessorResultStrings.push("'" + key + "':function(_z){" + writableVal + "=_z}");
                }
            }
            // Values are wrapped in a function so that each value can be accessed independently
            if (makeValueAccessors) {
                val = 'function(){return ' + val + ' }';
            }
            resultStrings.push("'" + key + "':" + val);
        }

        var resultStrings = [],
            propertyAccessorResultStrings = [],
            makeValueAccessors = bindingOptions['valueAccessors'],
            bindingParams = bindingOptions['bindingParams'],
            keyValueArray = typeof bindingsStringOrKeyValueArray === "string" ?
                parseObjectLiteral(bindingsStringOrKeyValueArray) : bindingsStringOrKeyValueArray;

        ko.utils.arrayForEach(keyValueArray, function(keyValue) {
            processKeyValue(keyValue.key || keyValue['unknown'], keyValue.value);
        });

        if (propertyAccessorResultStrings.length)
            processKeyValue('_ko_property_writers', "{" + propertyAccessorResultStrings.join(",") + " }");

        return resultStrings.join(",");
    }

    return {
        bindingRewriteValidators: [],

        twoWayBindings: twoWayBindings,

        parseObjectLiteral: parseObjectLiteral,

        preProcessBindings: preProcessBindings,

        keyValueArrayContainsKey: function(keyValueArray, key) {
            for (var i = 0; i < keyValueArray.length; i++)
                if (keyValueArray[i]['key'] == key)
                    return true;
            return false;
        },

        // Internal, private KO utility for updating model properties from within bindings
        // property:            If the property being updated is (or might be) an observable, pass it here
        //                      If it turns out to be a writable observable, it will be written to directly
        // allBindings:         An object with a get method to retrieve bindings in the current execution context.
        //                      This will be searched for a '_ko_property_writers' property in case you're writing to a non-observable
        // key:                 The key identifying the property to be written. Example: for { hasFocus: myValue }, write to 'myValue' by specifying the key 'hasFocus'
        // value:               The value to be written
        // checkIfDifferent:    If true, and if the property being written is a writable observable, the value will only be written if
        //                      it is !== existing value on that writable observable
        writeValueToProperty: function(property, allBindings, key, value, checkIfDifferent) {
            if (!property || !ko.isObservable(property)) {
                var propWriters = allBindings.get('_ko_property_writers');
                if (propWriters && propWriters[key])
                    propWriters[key](value);
            } else if (ko.isWriteableObservable(property) && (!checkIfDifferent || property.peek() !== value)) {
                property(value);
            }
        }
    };
})();

ko.exportSymbol('expressionRewriting', ko.expressionRewriting);
ko.exportSymbol('expressionRewriting.bindingRewriteValidators', ko.expressionRewriting.bindingRewriteValidators);
ko.exportSymbol('expressionRewriting.parseObjectLiteral', ko.expressionRewriting.parseObjectLiteral);
ko.exportSymbol('expressionRewriting.preProcessBindings', ko.expressionRewriting.preProcessBindings);

// Making bindings explicitly declare themselves as "two way" isn't ideal in the long term (it would be better if
// all bindings could use an official 'property writer' API without needing to declare that they might). However,
// since this is not, and has never been, a public API (_ko_property_writers was never documented), it's acceptable
// as an internal implementation detail in the short term.
// For those developers who rely on _ko_property_writers in their custom bindings, we expose _twoWayBindings as an
// undocumented feature that makes it relatively easy to upgrade to KO 3.0. However, this is still not an official
// public API, and we reserve the right to remove it at any time if we create a real public property writers API.
ko.exportSymbol('expressionRewriting._twoWayBindings', ko.expressionRewriting.twoWayBindings);

// For backward compatibility, define the following aliases. (Previously, these function names were misleading because
// they referred to JSON specifically, even though they actually work with arbitrary JavaScript object literal expressions.)
ko.exportSymbol('jsonExpressionRewriting', ko.expressionRewriting);
ko.exportSymbol('jsonExpressionRewriting.insertPropertyAccessorsIntoJson', ko.expressionRewriting.preProcessBindings);
(function() {
    // "Virtual elements" is an abstraction on top of the usual DOM API which understands the notion that comment nodes
    // may be used to represent hierarchy (in addition to the DOM's natural hierarchy).
    // If you call the DOM-manipulating functions on ko.virtualElements, you will be able to read and write the state
    // of that virtual hierarchy
    //
    // The point of all this is to support containerless templates (e.g., <!-- ko foreach:someCollection -->blah<!-- /ko -->)
    // without having to scatter special cases all over the binding and templating code.

    // IE 9 cannot reliably read the "nodeValue" property of a comment node (see https://github.com/SteveSanderson/knockout/issues/186)
    // but it does give them a nonstandard alternative property called "text" that it can read reliably. Other browsers don't have that property.
    // So, use node.text where available, and node.nodeValue elsewhere
    var commentNodesHaveTextProperty = document && document.createComment("test").text === "<!--test-->";

    var startCommentRegex = commentNodesHaveTextProperty ? /^<!--\s*ko(?:\s+([\s\S]+))?\s*-->$/ : /^\s*ko(?:\s+([\s\S]+))?\s*$/;
    var endCommentRegex =   commentNodesHaveTextProperty ? /^<!--\s*\/ko\s*-->$/ : /^\s*\/ko\s*$/;
    var htmlTagsWithOptionallyClosingChildren = { 'ul': true, 'ol': true };

    function isStartComment(node) {
        return (node.nodeType == 8) && startCommentRegex.test(commentNodesHaveTextProperty ? node.text : node.nodeValue);
    }

    function isEndComment(node) {
        return (node.nodeType == 8) && endCommentRegex.test(commentNodesHaveTextProperty ? node.text : node.nodeValue);
    }

    function getVirtualChildren(startComment, allowUnbalanced) {
        var currentNode = startComment;
        var depth = 1;
        var children = [];
        while (currentNode = currentNode.nextSibling) {
            if (isEndComment(currentNode)) {
                depth--;
                if (depth === 0)
                    return children;
            }

            children.push(currentNode);

            if (isStartComment(currentNode))
                depth++;
        }
        if (!allowUnbalanced)
            throw new Error("Cannot find closing comment tag to match: " + startComment.nodeValue);
        return null;
    }

    function getMatchingEndComment(startComment, allowUnbalanced) {
        var allVirtualChildren = getVirtualChildren(startComment, allowUnbalanced);
        if (allVirtualChildren) {
            if (allVirtualChildren.length > 0)
                return allVirtualChildren[allVirtualChildren.length - 1].nextSibling;
            return startComment.nextSibling;
        } else
            return null; // Must have no matching end comment, and allowUnbalanced is true
    }

    function getUnbalancedChildTags(node) {
        // e.g., from <div>OK</div><!-- ko blah --><span>Another</span>, returns: <!-- ko blah --><span>Another</span>
        //       from <div>OK</div><!-- /ko --><!-- /ko -->,             returns: <!-- /ko --><!-- /ko -->
        var childNode = node.firstChild, captureRemaining = null;
        if (childNode) {
            do {
                if (captureRemaining)                   // We already hit an unbalanced node and are now just scooping up all subsequent nodes
                    captureRemaining.push(childNode);
                else if (isStartComment(childNode)) {
                    var matchingEndComment = getMatchingEndComment(childNode, /* allowUnbalanced: */ true);
                    if (matchingEndComment)             // It's a balanced tag, so skip immediately to the end of this virtual set
                        childNode = matchingEndComment;
                    else
                        captureRemaining = [childNode]; // It's unbalanced, so start capturing from this point
                } else if (isEndComment(childNode)) {
                    captureRemaining = [childNode];     // It's unbalanced (if it wasn't, we'd have skipped over it already), so start capturing
                }
            } while (childNode = childNode.nextSibling);
        }
        return captureRemaining;
    }

    ko.virtualElements = {
        allowedBindings: {},

        childNodes: function(node) {
            return isStartComment(node) ? getVirtualChildren(node) : node.childNodes;
        },

        emptyNode: function(node) {
            if (!isStartComment(node))
                ko.utils.emptyDomNode(node);
            else {
                var virtualChildren = ko.virtualElements.childNodes(node);
                for (var i = 0, j = virtualChildren.length; i < j; i++)
                    ko.removeNode(virtualChildren[i]);
            }
        },

        setDomNodeChildren: function(node, childNodes) {
            if (!isStartComment(node))
                ko.utils.setDomNodeChildren(node, childNodes);
            else {
                ko.virtualElements.emptyNode(node);
                var endCommentNode = node.nextSibling; // Must be the next sibling, as we just emptied the children
                for (var i = 0, j = childNodes.length; i < j; i++)
                    endCommentNode.parentNode.insertBefore(childNodes[i], endCommentNode);
            }
        },

        prepend: function(containerNode, nodeToPrepend) {
            if (!isStartComment(containerNode)) {
                if (containerNode.firstChild)
                    containerNode.insertBefore(nodeToPrepend, containerNode.firstChild);
                else
                    containerNode.appendChild(nodeToPrepend);
            } else {
                // Start comments must always have a parent and at least one following sibling (the end comment)
                containerNode.parentNode.insertBefore(nodeToPrepend, containerNode.nextSibling);
            }
        },

        insertAfter: function(containerNode, nodeToInsert, insertAfterNode) {
            if (!insertAfterNode) {
                ko.virtualElements.prepend(containerNode, nodeToInsert);
            } else if (!isStartComment(containerNode)) {
                // Insert after insertion point
                if (insertAfterNode.nextSibling)
                    containerNode.insertBefore(nodeToInsert, insertAfterNode.nextSibling);
                else
                    containerNode.appendChild(nodeToInsert);
            } else {
                // Children of start comments must always have a parent and at least one following sibling (the end comment)
                containerNode.parentNode.insertBefore(nodeToInsert, insertAfterNode.nextSibling);
            }
        },

        firstChild: function(node) {
            if (!isStartComment(node))
                return node.firstChild;
            if (!node.nextSibling || isEndComment(node.nextSibling))
                return null;
            return node.nextSibling;
        },

        nextSibling: function(node) {
            if (isStartComment(node))
                node = getMatchingEndComment(node);
            if (node.nextSibling && isEndComment(node.nextSibling))
                return null;
            return node.nextSibling;
        },

        hasBindingValue: isStartComment,

        virtualNodeBindingValue: function(node) {
            var regexMatch = (commentNodesHaveTextProperty ? node.text : node.nodeValue).match(startCommentRegex);
            return regexMatch ? regexMatch[1] : null;
        },

        normaliseVirtualElementDomStructure: function(elementVerified) {
            // Workaround for https://github.com/SteveSanderson/knockout/issues/155
            // (IE <= 8 or IE 9 quirks mode parses your HTML weirdly, treating closing </li> tags as if they don't exist, thereby moving comment nodes
            // that are direct descendants of <ul> into the preceding <li>)
            if (!htmlTagsWithOptionallyClosingChildren[ko.utils.tagNameLower(elementVerified)])
                return;

            // Scan immediate children to see if they contain unbalanced comment tags. If they do, those comment tags
            // must be intended to appear *after* that child, so move them there.
            var childNode = elementVerified.firstChild;
            if (childNode) {
                do {
                    if (childNode.nodeType === 1) {
                        var unbalancedTags = getUnbalancedChildTags(childNode);
                        if (unbalancedTags) {
                            // Fix up the DOM by moving the unbalanced tags to where they most likely were intended to be placed - *after* the child
                            var nodeToInsertBefore = childNode.nextSibling;
                            for (var i = 0; i < unbalancedTags.length; i++) {
                                if (nodeToInsertBefore)
                                    elementVerified.insertBefore(unbalancedTags[i], nodeToInsertBefore);
                                else
                                    elementVerified.appendChild(unbalancedTags[i]);
                            }
                        }
                    }
                } while (childNode = childNode.nextSibling);
            }
        }
    };
})();
ko.exportSymbol('virtualElements', ko.virtualElements);
ko.exportSymbol('virtualElements.allowedBindings', ko.virtualElements.allowedBindings);
ko.exportSymbol('virtualElements.emptyNode', ko.virtualElements.emptyNode);
//ko.exportSymbol('virtualElements.firstChild', ko.virtualElements.firstChild);     // firstChild is not minified
ko.exportSymbol('virtualElements.insertAfter', ko.virtualElements.insertAfter);
//ko.exportSymbol('virtualElements.nextSibling', ko.virtualElements.nextSibling);   // nextSibling is not minified
ko.exportSymbol('virtualElements.prepend', ko.virtualElements.prepend);
ko.exportSymbol('virtualElements.setDomNodeChildren', ko.virtualElements.setDomNodeChildren);
(function() {
    var defaultBindingAttributeName = "data-bind";

    ko.bindingProvider = function() {
        this.bindingCache = {};
    };

    ko.utils.extend(ko.bindingProvider.prototype, {
        'nodeHasBindings': function(node) {
            switch (node.nodeType) {
                case 1: // Element
                    return node.getAttribute(defaultBindingAttributeName) != null
                        || ko.components['getComponentNameForNode'](node);
                case 8: // Comment node
                    return ko.virtualElements.hasBindingValue(node);
                default: return false;
            }
        },

        'getBindings': function(node, bindingContext) {
            var bindingsString = this['getBindingsString'](node, bindingContext),
                parsedBindings = bindingsString ? this['parseBindingsString'](bindingsString, bindingContext, node) : null;
            return ko.components.addBindingsForCustomElement(parsedBindings, node, bindingContext, /* valueAccessors */ false);
        },

        'getBindingAccessors': function(node, bindingContext) {
            var bindingsString = this['getBindingsString'](node, bindingContext),
                parsedBindings = bindingsString ? this['parseBindingsString'](bindingsString, bindingContext, node, { 'valueAccessors': true }) : null;
            return ko.components.addBindingsForCustomElement(parsedBindings, node, bindingContext, /* valueAccessors */ true);
        },

        // The following function is only used internally by this default provider.
        // It's not part of the interface definition for a general binding provider.
        'getBindingsString': function(node, bindingContext) {
            switch (node.nodeType) {
                case 1: return node.getAttribute(defaultBindingAttributeName);   // Element
                case 8: return ko.virtualElements.virtualNodeBindingValue(node); // Comment node
                default: return null;
            }
        },

        // The following function is only used internally by this default provider.
        // It's not part of the interface definition for a general binding provider.
        'parseBindingsString': function(bindingsString, bindingContext, node, options) {
            try {
                var bindingFunction = createBindingsStringEvaluatorViaCache(bindingsString, this.bindingCache, options);
                return bindingFunction(bindingContext, node);
            } catch (ex) {
                ex.message = "Unable to parse bindings.\nBindings value: " + bindingsString + "\nMessage: " + ex.message;
                throw ex;
            }
        }
    });

    ko.bindingProvider['instance'] = new ko.bindingProvider();

    function createBindingsStringEvaluatorViaCache(bindingsString, cache, options) {
        var cacheKey = bindingsString + (options && options['valueAccessors'] || '');
        return cache[cacheKey]
            || (cache[cacheKey] = createBindingsStringEvaluator(bindingsString, options));
    }

    function createBindingsStringEvaluator(bindingsString, options) {
        // Build the source for a function that evaluates "expression"
        // For each scope variable, add an extra level of "with" nesting
        // Example result: with(sc1) { with(sc0) { return (expression) } }
        var rewrittenBindings = ko.expressionRewriting.preProcessBindings(bindingsString, options),
            functionBody = "with($context){with($data||{}){return{" + rewrittenBindings + "}}}";
        return new Function("$context", "$element", functionBody);
    }
})();

ko.exportSymbol('bindingProvider', ko.bindingProvider);
(function () {
    ko.bindingHandlers = {};

    // The following element types will not be recursed into during binding.
    var bindingDoesNotRecurseIntoElementTypes = {
        // Don't want bindings that operate on text nodes to mutate <script> and <textarea> contents,
        // because it's unexpected and a potential XSS issue.
        // Also bindings should not operate on <template> elements since this breaks in Internet Explorer
        // and because such elements' contents are always intended to be bound in a different context
        // from where they appear in the document.
        'script': true,
        'textarea': true,
        'template': true
    };

    // Use an overridable method for retrieving binding handlers so that a plugins may support dynamically created handlers
    ko['getBindingHandler'] = function(bindingKey) {
        return ko.bindingHandlers[bindingKey];
    };

    // The ko.bindingContext constructor is only called directly to create the root context. For child
    // contexts, use bindingContext.createChildContext or bindingContext.extend.
    ko.bindingContext = function(dataItemOrAccessor, parentContext, dataItemAlias, extendCallback) {

        // The binding context object includes static properties for the current, parent, and root view models.
        // If a view model is actually stored in an observable, the corresponding binding context object, and
        // any child contexts, must be updated when the view model is changed.
        function updateContext() {
            // Most of the time, the context will directly get a view model object, but if a function is given,
            // we call the function to retrieve the view model. If the function accesses any observables or returns
            // an observable, the dependency is tracked, and those observables can later cause the binding
            // context to be updated.
            var dataItemOrObservable = isFunc ? dataItemOrAccessor() : dataItemOrAccessor,
                dataItem = ko.utils.unwrapObservable(dataItemOrObservable);

            if (parentContext) {
                // When a "parent" context is given, register a dependency on the parent context. Thus whenever the
                // parent context is updated, this context will also be updated.
                if (parentContext._subscribable)
                    parentContext._subscribable();

                // Copy $root and any custom properties from the parent context
                ko.utils.extend(self, parentContext);

                // Because the above copy overwrites our own properties, we need to reset them.
                // During the first execution, "subscribable" isn't set, so don't bother doing the update then.
                if (subscribable) {
                    self._subscribable = subscribable;
                }
            } else {
                self['$parents'] = [];
                self['$root'] = dataItem;

                // Export 'ko' in the binding context so it will be available in bindings and templates
                // even if 'ko' isn't exported as a global, such as when using an AMD loader.
                // See https://github.com/SteveSanderson/knockout/issues/490
                self['ko'] = ko;
            }
            self['$rawData'] = dataItemOrObservable;
            self['$data'] = dataItem;
            if (dataItemAlias)
                self[dataItemAlias] = dataItem;

            // The extendCallback function is provided when creating a child context or extending a context.
            // It handles the specific actions needed to finish setting up the binding context. Actions in this
            // function could also add dependencies to this binding context.
            if (extendCallback)
                extendCallback(self, parentContext, dataItem);

            return self['$data'];
        }
        function disposeWhen() {
            return nodes && !ko.utils.anyDomNodeIsAttachedToDocument(nodes);
        }

        var self = this,
            isFunc = typeof(dataItemOrAccessor) == "function" && !ko.isObservable(dataItemOrAccessor),
            nodes,
            subscribable = ko.dependentObservable(updateContext, null, { disposeWhen: disposeWhen, disposeWhenNodeIsRemoved: true });

        // At this point, the binding context has been initialized, and the "subscribable" computed observable is
        // subscribed to any observables that were accessed in the process. If there is nothing to track, the
        // computed will be inactive, and we can safely throw it away. If it's active, the computed is stored in
        // the context object.
        if (subscribable.isActive()) {
            self._subscribable = subscribable;

            // Always notify because even if the model ($data) hasn't changed, other context properties might have changed
            subscribable['equalityComparer'] = null;

            // We need to be able to dispose of this computed observable when it's no longer needed. This would be
            // easy if we had a single node to watch, but binding contexts can be used by many different nodes, and
            // we cannot assume that those nodes have any relation to each other. So instead we track any node that
            // the context is attached to, and dispose the computed when all of those nodes have been cleaned.

            // Add properties to *subscribable* instead of *self* because any properties added to *self* may be overwritten on updates
            nodes = [];
            subscribable._addNode = function(node) {
                nodes.push(node);
                ko.utils.domNodeDisposal.addDisposeCallback(node, function(node) {
                    ko.utils.arrayRemoveItem(nodes, node);
                    if (!nodes.length) {
                        subscribable.dispose();
                        self._subscribable = subscribable = undefined;
                    }
                });
            };
        }
    }

    // Extend the binding context hierarchy with a new view model object. If the parent context is watching
    // any observables, the new child context will automatically get a dependency on the parent context.
    // But this does not mean that the $data value of the child context will also get updated. If the child
    // view model also depends on the parent view model, you must provide a function that returns the correct
    // view model on each update.
    ko.bindingContext.prototype['createChildContext'] = function (dataItemOrAccessor, dataItemAlias, extendCallback) {
        return new ko.bindingContext(dataItemOrAccessor, this, dataItemAlias, function(self, parentContext) {
            // Extend the context hierarchy by setting the appropriate pointers
            self['$parentContext'] = parentContext;
            self['$parent'] = parentContext['$data'];
            self['$parents'] = (parentContext['$parents'] || []).slice(0);
            self['$parents'].unshift(self['$parent']);
            if (extendCallback)
                extendCallback(self);
        });
    };

    // Extend the binding context with new custom properties. This doesn't change the context hierarchy.
    // Similarly to "child" contexts, provide a function here to make sure that the correct values are set
    // when an observable view model is updated.
    ko.bindingContext.prototype['extend'] = function(properties) {
        // If the parent context references an observable view model, "_subscribable" will always be the
        // latest view model object. If not, "_subscribable" isn't set, and we can use the static "$data" value.
        return new ko.bindingContext(this._subscribable || this['$data'], this, null, function(self, parentContext) {
            // This "child" context doesn't directly track a parent observable view model,
            // so we need to manually set the $rawData value to match the parent.
            self['$rawData'] = parentContext['$rawData'];
            ko.utils.extend(self, typeof(properties) == "function" ? properties() : properties);
        });
    };

    // Returns the valueAccesor function for a binding value
    function makeValueAccessor(value) {
        return function() {
            return value;
        };
    }

    // Returns the value of a valueAccessor function
    function evaluateValueAccessor(valueAccessor) {
        return valueAccessor();
    }

    // Given a function that returns bindings, create and return a new object that contains
    // binding value-accessors functions. Each accessor function calls the original function
    // so that it always gets the latest value and all dependencies are captured. This is used
    // by ko.applyBindingsToNode and getBindingsAndMakeAccessors.
    function makeAccessorsFromFunction(callback) {
        return ko.utils.objectMap(ko.dependencyDetection.ignore(callback), function(value, key) {
            return function() {
                return callback()[key];
            };
        });
    }

    // Given a bindings function or object, create and return a new object that contains
    // binding value-accessors functions. This is used by ko.applyBindingsToNode.
    function makeBindingAccessors(bindings, context, node) {
        if (typeof bindings === 'function') {
            return makeAccessorsFromFunction(bindings.bind(null, context, node));
        } else {
            return ko.utils.objectMap(bindings, makeValueAccessor);
        }
    }

    // This function is used if the binding provider doesn't include a getBindingAccessors function.
    // It must be called with 'this' set to the provider instance.
    function getBindingsAndMakeAccessors(node, context) {
        return makeAccessorsFromFunction(this['getBindings'].bind(this, node, context));
    }

    function validateThatBindingIsAllowedForVirtualElements(bindingName) {
        var validator = ko.virtualElements.allowedBindings[bindingName];
        if (!validator)
            throw new Error("The binding '" + bindingName + "' cannot be used with virtual elements")
    }

    function applyBindingsToDescendantsInternal (bindingContext, elementOrVirtualElement, bindingContextsMayDifferFromDomParentElement) {
        var currentChild,
            nextInQueue = ko.virtualElements.firstChild(elementOrVirtualElement),
            provider = ko.bindingProvider['instance'],
            preprocessNode = provider['preprocessNode'];

        // Preprocessing allows a binding provider to mutate a node before bindings are applied to it. For example it's
        // possible to insert new siblings after it, and/or replace the node with a different one. This can be used to
        // implement custom binding syntaxes, such as {{ value }} for string interpolation, or custom element types that
        // trigger insertion of <template> contents at that point in the document.
        if (preprocessNode) {
            while (currentChild = nextInQueue) {
                nextInQueue = ko.virtualElements.nextSibling(currentChild);
                preprocessNode.call(provider, currentChild);
            }
            // Reset nextInQueue for the next loop
            nextInQueue = ko.virtualElements.firstChild(elementOrVirtualElement);
        }

        while (currentChild = nextInQueue) {
            // Keep a record of the next child *before* applying bindings, in case the binding removes the current child from its position
            nextInQueue = ko.virtualElements.nextSibling(currentChild);
            applyBindingsToNodeAndDescendantsInternal(bindingContext, currentChild, bindingContextsMayDifferFromDomParentElement);
        }
    }

    function applyBindingsToNodeAndDescendantsInternal (bindingContext, nodeVerified, bindingContextMayDifferFromDomParentElement) {
        var shouldBindDescendants = true;

        // Perf optimisation: Apply bindings only if...
        // (1) We need to store the binding context on this node (because it may differ from the DOM parent node's binding context)
        //     Note that we can't store binding contexts on non-elements (e.g., text nodes), as IE doesn't allow expando properties for those
        // (2) It might have bindings (e.g., it has a data-bind attribute, or it's a marker for a containerless template)
        var isElement = (nodeVerified.nodeType === 1);
        if (isElement) // Workaround IE <= 8 HTML parsing weirdness
            ko.virtualElements.normaliseVirtualElementDomStructure(nodeVerified);

        var shouldApplyBindings = (isElement && bindingContextMayDifferFromDomParentElement)             // Case (1)
                               || ko.bindingProvider['instance']['nodeHasBindings'](nodeVerified);       // Case (2)
        if (shouldApplyBindings)
            shouldBindDescendants = applyBindingsToNodeInternal(nodeVerified, null, bindingContext, bindingContextMayDifferFromDomParentElement)['shouldBindDescendants'];

        if (shouldBindDescendants && !bindingDoesNotRecurseIntoElementTypes[ko.utils.tagNameLower(nodeVerified)]) {
            // We're recursing automatically into (real or virtual) child nodes without changing binding contexts. So,
            //  * For children of a *real* element, the binding context is certainly the same as on their DOM .parentNode,
            //    hence bindingContextsMayDifferFromDomParentElement is false
            //  * For children of a *virtual* element, we can't be sure. Evaluating .parentNode on those children may
            //    skip over any number of intermediate virtual elements, any of which might define a custom binding context,
            //    hence bindingContextsMayDifferFromDomParentElement is true
            applyBindingsToDescendantsInternal(bindingContext, nodeVerified, /* bindingContextsMayDifferFromDomParentElement: */ !isElement);
        }
    }

    var boundElementDomDataKey = ko.utils.domData.nextKey();


    function topologicalSortBindings(bindings) {
        // Depth-first sort
        var result = [],                // The list of key/handler pairs that we will return
            bindingsConsidered = {},    // A temporary record of which bindings are already in 'result'
            cyclicDependencyStack = []; // Keeps track of a depth-search so that, if there's a cycle, we know which bindings caused it
        ko.utils.objectForEach(bindings, function pushBinding(bindingKey) {
            if (!bindingsConsidered[bindingKey]) {
                var binding = ko['getBindingHandler'](bindingKey);
                if (binding) {
                    // First add dependencies (if any) of the current binding
                    if (binding['after']) {
                        cyclicDependencyStack.push(bindingKey);
                        ko.utils.arrayForEach(binding['after'], function(bindingDependencyKey) {
                            if (bindings[bindingDependencyKey]) {
                                if (ko.utils.arrayIndexOf(cyclicDependencyStack, bindingDependencyKey) !== -1) {
                                    throw Error("Cannot combine the following bindings, because they have a cyclic dependency: " + cyclicDependencyStack.join(", "));
                                } else {
                                    pushBinding(bindingDependencyKey);
                                }
                            }
                        });
                        cyclicDependencyStack.length--;
                    }
                    // Next add the current binding
                    result.push({ key: bindingKey, handler: binding });
                }
                bindingsConsidered[bindingKey] = true;
            }
        });

        return result;
    }

    function applyBindingsToNodeInternal(node, sourceBindings, bindingContext, bindingContextMayDifferFromDomParentElement) {
        // Prevent multiple applyBindings calls for the same node, except when a binding value is specified
        var alreadyBound = ko.utils.domData.get(node, boundElementDomDataKey);
        if (!sourceBindings) {
            if (alreadyBound) {
                throw Error("You cannot apply bindings multiple times to the same element.");
            }
            ko.utils.domData.set(node, boundElementDomDataKey, true);
        }

        // Optimization: Don't store the binding context on this node if it's definitely the same as on node.parentNode, because
        // we can easily recover it just by scanning up the node's ancestors in the DOM
        // (note: here, parent node means "real DOM parent" not "virtual parent", as there's no O(1) way to find the virtual parent)
        if (!alreadyBound && bindingContextMayDifferFromDomParentElement)
            ko.storedBindingContextForNode(node, bindingContext);

        // Use bindings if given, otherwise fall back on asking the bindings provider to give us some bindings
        var bindings;
        if (sourceBindings && typeof sourceBindings !== 'function') {
            bindings = sourceBindings;
        } else {
            var provider = ko.bindingProvider['instance'],
                getBindings = provider['getBindingAccessors'] || getBindingsAndMakeAccessors;

            // Get the binding from the provider within a computed observable so that we can update the bindings whenever
            // the binding context is updated or if the binding provider accesses observables.
            var bindingsUpdater = ko.dependentObservable(
                function() {
                    bindings = sourceBindings ? sourceBindings(bindingContext, node) : getBindings.call(provider, node, bindingContext);
                    // Register a dependency on the binding context to support observable view models.
                    if (bindings && bindingContext._subscribable)
                        bindingContext._subscribable();
                    return bindings;
                },
                null, { disposeWhenNodeIsRemoved: node }
            );

            if (!bindings || !bindingsUpdater.isActive())
                bindingsUpdater = null;
        }

        var bindingHandlerThatControlsDescendantBindings;
        if (bindings) {
            // Return the value accessor for a given binding. When bindings are static (won't be updated because of a binding
            // context update), just return the value accessor from the binding. Otherwise, return a function that always gets
            // the latest binding value and registers a dependency on the binding updater.
            var getValueAccessor = bindingsUpdater
                ? function(bindingKey) {
                    return function() {
                        return evaluateValueAccessor(bindingsUpdater()[bindingKey]);
                    };
                } : function(bindingKey) {
                    return bindings[bindingKey];
                };

            // Use of allBindings as a function is maintained for backwards compatibility, but its use is deprecated
            function allBindings() {
                return ko.utils.objectMap(bindingsUpdater ? bindingsUpdater() : bindings, evaluateValueAccessor);
            }
            // The following is the 3.x allBindings API
            allBindings['get'] = function(key) {
                return bindings[key] && evaluateValueAccessor(getValueAccessor(key));
            };
            allBindings['has'] = function(key) {
                return key in bindings;
            };

            // First put the bindings into the right order
            var orderedBindings = topologicalSortBindings(bindings);

            // Go through the sorted bindings, calling init and update for each
            ko.utils.arrayForEach(orderedBindings, function(bindingKeyAndHandler) {
                // Note that topologicalSortBindings has already filtered out any nonexistent binding handlers,
                // so bindingKeyAndHandler.handler will always be nonnull.
                var handlerInitFn = bindingKeyAndHandler.handler["init"],
                    handlerUpdateFn = bindingKeyAndHandler.handler["update"],
                    bindingKey = bindingKeyAndHandler.key;

                if (node.nodeType === 8) {
                    validateThatBindingIsAllowedForVirtualElements(bindingKey);
                }

                try {
                    // Run init, ignoring any dependencies
                    if (typeof handlerInitFn == "function") {
                        ko.dependencyDetection.ignore(function() {
                            var initResult = handlerInitFn(node, getValueAccessor(bindingKey), allBindings, bindingContext['$data'], bindingContext);

                            // If this binding handler claims to control descendant bindings, make a note of this
                            if (initResult && initResult['controlsDescendantBindings']) {
                                if (bindingHandlerThatControlsDescendantBindings !== undefined)
                                    throw new Error("Multiple bindings (" + bindingHandlerThatControlsDescendantBindings + " and " + bindingKey + ") are trying to control descendant bindings of the same element. You cannot use these bindings together on the same element.");
                                bindingHandlerThatControlsDescendantBindings = bindingKey;
                            }
                        });
                    }

                    // Run update in its own computed wrapper
                    if (typeof handlerUpdateFn == "function") {
                        ko.dependentObservable(
                            function() {
                                handlerUpdateFn(node, getValueAccessor(bindingKey), allBindings, bindingContext['$data'], bindingContext);
                            },
                            null,
                            { disposeWhenNodeIsRemoved: node }
                        );
                    }
                } catch (ex) {
                    ex.message = "Unable to process binding \"" + bindingKey + ": " + bindings[bindingKey] + "\"\nMessage: " + ex.message;
                    throw ex;
                }
            });
        }

        return {
            'shouldBindDescendants': bindingHandlerThatControlsDescendantBindings === undefined
        };
    };

    var storedBindingContextDomDataKey = ko.utils.domData.nextKey();
    ko.storedBindingContextForNode = function (node, bindingContext) {
        if (arguments.length == 2) {
            ko.utils.domData.set(node, storedBindingContextDomDataKey, bindingContext);
            if (bindingContext._subscribable)
                bindingContext._subscribable._addNode(node);
        } else {
            return ko.utils.domData.get(node, storedBindingContextDomDataKey);
        }
    }

    function getBindingContext(viewModelOrBindingContext) {
        return viewModelOrBindingContext && (viewModelOrBindingContext instanceof ko.bindingContext)
            ? viewModelOrBindingContext
            : new ko.bindingContext(viewModelOrBindingContext);
    }

    ko.applyBindingAccessorsToNode = function (node, bindings, viewModelOrBindingContext) {
        if (node.nodeType === 1) // If it's an element, workaround IE <= 8 HTML parsing weirdness
            ko.virtualElements.normaliseVirtualElementDomStructure(node);
        return applyBindingsToNodeInternal(node, bindings, getBindingContext(viewModelOrBindingContext), true);
    };

    ko.applyBindingsToNode = function (node, bindings, viewModelOrBindingContext) {
        var context = getBindingContext(viewModelOrBindingContext);
        return ko.applyBindingAccessorsToNode(node, makeBindingAccessors(bindings, context, node), context);
    };

    ko.applyBindingsToDescendants = function(viewModelOrBindingContext, rootNode) {
        if (rootNode.nodeType === 1 || rootNode.nodeType === 8)
            applyBindingsToDescendantsInternal(getBindingContext(viewModelOrBindingContext), rootNode, true);
    };

    ko.applyBindings = function (viewModelOrBindingContext, rootNode) {
        // If jQuery is loaded after Knockout, we won't initially have access to it. So save it here.
        if (!jQueryInstance && window['jQuery']) {
            jQueryInstance = window['jQuery'];
        }

        if (rootNode && (rootNode.nodeType !== 1) && (rootNode.nodeType !== 8))
            throw new Error("ko.applyBindings: first parameter should be your view model; second parameter should be a DOM node");
        rootNode = rootNode || window.document.body; // Make "rootNode" parameter optional

        applyBindingsToNodeAndDescendantsInternal(getBindingContext(viewModelOrBindingContext), rootNode, true);
    };

    // Retrieving binding context from arbitrary nodes
    ko.contextFor = function(node) {
        // We can only do something meaningful for elements and comment nodes (in particular, not text nodes, as IE can't store domdata for them)
        switch (node.nodeType) {
            case 1:
            case 8:
                var context = ko.storedBindingContextForNode(node);
                if (context) return context;
                if (node.parentNode) return ko.contextFor(node.parentNode);
                break;
        }
        return undefined;
    };
    ko.dataFor = function(node) {
        var context = ko.contextFor(node);
        return context ? context['$data'] : undefined;
    };

    ko.exportSymbol('bindingHandlers', ko.bindingHandlers);
    ko.exportSymbol('applyBindings', ko.applyBindings);
    ko.exportSymbol('applyBindingsToDescendants', ko.applyBindingsToDescendants);
    ko.exportSymbol('applyBindingAccessorsToNode', ko.applyBindingAccessorsToNode);
    ko.exportSymbol('applyBindingsToNode', ko.applyBindingsToNode);
    ko.exportSymbol('contextFor', ko.contextFor);
    ko.exportSymbol('dataFor', ko.dataFor);
})();
(function(undefined) {
    var loadingSubscribablesCache = {}, // Tracks component loads that are currently in flight
        loadedDefinitionsCache = {};    // Tracks component loads that have already completed

    ko.components = {
        get: function(componentName, callback) {
            var cachedDefinition = getObjectOwnProperty(loadedDefinitionsCache, componentName);
            if (cachedDefinition) {
                // It's already loaded and cached. Reuse the same definition object.
                // Note that for API consistency, even cache hits complete asynchronously by default.
                // You can bypass this by putting synchronous:true on your component config.
                if (cachedDefinition.isSynchronousComponent) {
                    ko.dependencyDetection.ignore(function() { // See comment in loaderRegistryBehaviors.js for reasoning
                        callback(cachedDefinition.definition);
                    });
                } else {
                    ko.tasks.schedule(function() { callback(cachedDefinition.definition); });
                }
            } else {
                // Join the loading process that is already underway, or start a new one.
                loadComponentAndNotify(componentName, callback);
            }
        },

        clearCachedDefinition: function(componentName) {
            delete loadedDefinitionsCache[componentName];
        },

        _getFirstResultFromLoaders: getFirstResultFromLoaders
    };

    function getObjectOwnProperty(obj, propName) {
        return obj.hasOwnProperty(propName) ? obj[propName] : undefined;
    }

    function loadComponentAndNotify(componentName, callback) {
        var subscribable = getObjectOwnProperty(loadingSubscribablesCache, componentName),
            completedAsync;
        if (!subscribable) {
            // It's not started loading yet. Start loading, and when it's done, move it to loadedDefinitionsCache.
            subscribable = loadingSubscribablesCache[componentName] = new ko.subscribable();
            subscribable.subscribe(callback);

            beginLoadingComponent(componentName, function(definition, config) {
                var isSynchronousComponent = !!(config && config['synchronous']);
                loadedDefinitionsCache[componentName] = { definition: definition, isSynchronousComponent: isSynchronousComponent };
                delete loadingSubscribablesCache[componentName];

                // For API consistency, all loads complete asynchronously. However we want to avoid
                // adding an extra task schedule if it's unnecessary (i.e., the completion is already
                // async).
                //
                // You can bypass the 'always asynchronous' feature by putting the synchronous:true
                // flag on your component configuration when you register it.
                if (completedAsync || isSynchronousComponent) {
                    // Note that notifySubscribers ignores any dependencies read within the callback.
                    // See comment in loaderRegistryBehaviors.js for reasoning
                    subscribable['notifySubscribers'](definition);
                } else {
                    ko.tasks.schedule(function() {
                        subscribable['notifySubscribers'](definition);
                    });
                }
            });
            completedAsync = true;
        } else {
            subscribable.subscribe(callback);
        }
    }

    function beginLoadingComponent(componentName, callback) {
        getFirstResultFromLoaders('getConfig', [componentName], function(config) {
            if (config) {
                // We have a config, so now load its definition
                getFirstResultFromLoaders('loadComponent', [componentName, config], function(definition) {
                    callback(definition, config);
                });
            } else {
                // The component has no config - it's unknown to all the loaders.
                // Note that this is not an error (e.g., a module loading error) - that would abort the
                // process and this callback would not run. For this callback to run, all loaders must
                // have confirmed they don't know about this component.
                callback(null, null);
            }
        });
    }

    function getFirstResultFromLoaders(methodName, argsExceptCallback, callback, candidateLoaders) {
        // On the first call in the stack, start with the full set of loaders
        if (!candidateLoaders) {
            candidateLoaders = ko.components['loaders'].slice(0); // Use a copy, because we'll be mutating this array
        }

        // Try the next candidate
        var currentCandidateLoader = candidateLoaders.shift();
        if (currentCandidateLoader) {
            var methodInstance = currentCandidateLoader[methodName];
            if (methodInstance) {
                var wasAborted = false,
                    synchronousReturnValue = methodInstance.apply(currentCandidateLoader, argsExceptCallback.concat(function(result) {
                        if (wasAborted) {
                            callback(null);
                        } else if (result !== null) {
                            // This candidate returned a value. Use it.
                            callback(result);
                        } else {
                            // Try the next candidate
                            getFirstResultFromLoaders(methodName, argsExceptCallback, callback, candidateLoaders);
                        }
                    }));

                // Currently, loaders may not return anything synchronously. This leaves open the possibility
                // that we'll extend the API to support synchronous return values in the future. It won't be
                // a breaking change, because currently no loader is allowed to return anything except undefined.
                if (synchronousReturnValue !== undefined) {
                    wasAborted = true;

                    // Method to suppress exceptions will remain undocumented. This is only to keep
                    // KO's specs running tidily, since we can observe the loading got aborted without
                    // having exceptions cluttering up the console too.
                    if (!currentCandidateLoader['suppressLoaderExceptions']) {
                        throw new Error('Component loaders must supply values by invoking the callback, not by returning values synchronously.');
                    }
                }
            } else {
                // This candidate doesn't have the relevant handler. Synchronously move on to the next one.
                getFirstResultFromLoaders(methodName, argsExceptCallback, callback, candidateLoaders);
            }
        } else {
            // No candidates returned a value
            callback(null);
        }
    }

    // Reference the loaders via string name so it's possible for developers
    // to replace the whole array by assigning to ko.components.loaders
    ko.components['loaders'] = [];

    ko.exportSymbol('components', ko.components);
    ko.exportSymbol('components.get', ko.components.get);
    ko.exportSymbol('components.clearCachedDefinition', ko.components.clearCachedDefinition);
})();
(function(undefined) {

    // The default loader is responsible for two things:
    // 1. Maintaining the default in-memory registry of component configuration objects
    //    (i.e., the thing you're writing to when you call ko.components.register(someName, ...))
    // 2. Answering requests for components by fetching configuration objects
    //    from that default in-memory registry and resolving them into standard
    //    component definition objects (of the form { createViewModel: ..., template: ... })
    // Custom loaders may override either of these facilities, i.e.,
    // 1. To supply configuration objects from some other source (e.g., conventions)
    // 2. Or, to resolve configuration objects by loading viewmodels/templates via arbitrary logic.

    var defaultConfigRegistry = {};

    ko.components.register = function(componentName, config) {
        if (!config) {
            throw new Error('Invalid configuration for ' + componentName);
        }

        if (ko.components.isRegistered(componentName)) {
            throw new Error('Component ' + componentName + ' is already registered');
        }

        defaultConfigRegistry[componentName] = config;
    };

    ko.components.isRegistered = function(componentName) {
        return defaultConfigRegistry.hasOwnProperty(componentName);
    };

    ko.components.unregister = function(componentName) {
        delete defaultConfigRegistry[componentName];
        ko.components.clearCachedDefinition(componentName);
    };

    ko.components.defaultLoader = {
        'getConfig': function(componentName, callback) {
            var result = defaultConfigRegistry.hasOwnProperty(componentName)
                ? defaultConfigRegistry[componentName]
                : null;
            callback(result);
        },

        'loadComponent': function(componentName, config, callback) {
            var errorCallback = makeErrorCallback(componentName);
            possiblyGetConfigFromAmd(errorCallback, config, function(loadedConfig) {
                resolveConfig(componentName, errorCallback, loadedConfig, callback);
            });
        },

        'loadTemplate': function(componentName, templateConfig, callback) {
            resolveTemplate(makeErrorCallback(componentName), templateConfig, callback);
        },

        'loadViewModel': function(componentName, viewModelConfig, callback) {
            resolveViewModel(makeErrorCallback(componentName), viewModelConfig, callback);
        }
    };

    var createViewModelKey = 'createViewModel';

    // Takes a config object of the form { template: ..., viewModel: ... }, and asynchronously convert it
    // into the standard component definition format:
    //    { template: <ArrayOfDomNodes>, createViewModel: function(params, componentInfo) { ... } }.
    // Since both template and viewModel may need to be resolved asynchronously, both tasks are performed
    // in parallel, and the results joined when both are ready. We don't depend on any promises infrastructure,
    // so this is implemented manually below.
    function resolveConfig(componentName, errorCallback, config, callback) {
        var result = {},
            makeCallBackWhenZero = 2,
            tryIssueCallback = function() {
                if (--makeCallBackWhenZero === 0) {
                    callback(result);
                }
            },
            templateConfig = config['template'],
            viewModelConfig = config['viewModel'];

        if (templateConfig) {
            possiblyGetConfigFromAmd(errorCallback, templateConfig, function(loadedConfig) {
                ko.components._getFirstResultFromLoaders('loadTemplate', [componentName, loadedConfig], function(resolvedTemplate) {
                    result['template'] = resolvedTemplate;
                    tryIssueCallback();
                });
            });
        } else {
            tryIssueCallback();
        }

        if (viewModelConfig) {
            possiblyGetConfigFromAmd(errorCallback, viewModelConfig, function(loadedConfig) {
                ko.components._getFirstResultFromLoaders('loadViewModel', [componentName, loadedConfig], function(resolvedViewModel) {
                    result[createViewModelKey] = resolvedViewModel;
                    tryIssueCallback();
                });
            });
        } else {
            tryIssueCallback();
        }
    }

    function resolveTemplate(errorCallback, templateConfig, callback) {
        if (typeof templateConfig === 'string') {
            // Markup - parse it
            callback(ko.utils.parseHtmlFragment(templateConfig));
        } else if (templateConfig instanceof Array) {
            // Assume already an array of DOM nodes - pass through unchanged
            callback(templateConfig);
        } else if (isDocumentFragment(templateConfig)) {
            // Document fragment - use its child nodes
            callback(ko.utils.makeArray(templateConfig.childNodes));
        } else if (templateConfig['element']) {
            var element = templateConfig['element'];
            if (isDomElement(element)) {
                // Element instance - copy its child nodes
                callback(cloneNodesFromTemplateSourceElement(element));
            } else if (typeof element === 'string') {
                // Element ID - find it, then copy its child nodes
                var elemInstance = document.getElementById(element);
                if (elemInstance) {
                    callback(cloneNodesFromTemplateSourceElement(elemInstance));
                } else {
                    errorCallback('Cannot find element with ID ' + element);
                }
            } else {
                errorCallback('Unknown element type: ' + element);
            }
        } else {
            errorCallback('Unknown template value: ' + templateConfig);
        }
    }

    function resolveViewModel(errorCallback, viewModelConfig, callback) {
        if (typeof viewModelConfig === 'function') {
            // Constructor - convert to standard factory function format
            // By design, this does *not* supply componentInfo to the constructor, as the intent is that
            // componentInfo contains non-viewmodel data (e.g., the component's element) that should only
            // be used in factory functions, not viewmodel constructors.
            callback(function (params /*, componentInfo */) {
                return new viewModelConfig(params);
            });
        } else if (typeof viewModelConfig[createViewModelKey] === 'function') {
            // Already a factory function - use it as-is
            callback(viewModelConfig[createViewModelKey]);
        } else if ('instance' in viewModelConfig) {
            // Fixed object instance - promote to createViewModel format for API consistency
            var fixedInstance = viewModelConfig['instance'];
            callback(function (params, componentInfo) {
                return fixedInstance;
            });
        } else if ('viewModel' in viewModelConfig) {
            // Resolved AMD module whose value is of the form { viewModel: ... }
            resolveViewModel(errorCallback, viewModelConfig['viewModel'], callback);
        } else {
            errorCallback('Unknown viewModel value: ' + viewModelConfig);
        }
    }

    function cloneNodesFromTemplateSourceElement(elemInstance) {
        switch (ko.utils.tagNameLower(elemInstance)) {
            case 'script':
                return ko.utils.parseHtmlFragment(elemInstance.text);
            case 'textarea':
                return ko.utils.parseHtmlFragment(elemInstance.value);
            case 'template':
                // For browsers with proper <template> element support (i.e., where the .content property
                // gives a document fragment), use that document fragment.
                if (isDocumentFragment(elemInstance.content)) {
                    return ko.utils.cloneNodes(elemInstance.content.childNodes);
                }
        }

        // Regular elements such as <div>, and <template> elements on old browsers that don't really
        // understand <template> and just treat it as a regular container
        return ko.utils.cloneNodes(elemInstance.childNodes);
    }

    function isDomElement(obj) {
        if (window['HTMLElement']) {
            return obj instanceof HTMLElement;
        } else {
            return obj && obj.tagName && obj.nodeType === 1;
        }
    }

    function isDocumentFragment(obj) {
        if (window['DocumentFragment']) {
            return obj instanceof DocumentFragment;
        } else {
            return obj && obj.nodeType === 11;
        }
    }

    function possiblyGetConfigFromAmd(errorCallback, config, callback) {
        if (typeof config['require'] === 'string') {
            // The config is the value of an AMD module
            if (amdRequire || window['require']) {
                (amdRequire || window['require'])([config['require']], callback);
            } else {
                errorCallback('Uses require, but no AMD loader is present');
            }
        } else {
            callback(config);
        }
    }

    function makeErrorCallback(componentName) {
        return function (message) {
            throw new Error('Component \'' + componentName + '\': ' + message);
        };
    }

    ko.exportSymbol('components.register', ko.components.register);
    ko.exportSymbol('components.isRegistered', ko.components.isRegistered);
    ko.exportSymbol('components.unregister', ko.components.unregister);

    // Expose the default loader so that developers can directly ask it for configuration
    // or to resolve configuration
    ko.exportSymbol('components.defaultLoader', ko.components.defaultLoader);

    // By default, the default loader is the only registered component loader
    ko.components['loaders'].push(ko.components.defaultLoader);

    // Privately expose the underlying config registry for use in old-IE shim
    ko.components._allRegisteredComponents = defaultConfigRegistry;
})();
(function (undefined) {
    // Overridable API for determining which component name applies to a given node. By overriding this,
    // you can for example map specific tagNames to components that are not preregistered.
    ko.components['getComponentNameForNode'] = function(node) {
        var tagNameLower = ko.utils.tagNameLower(node);
        if (ko.components.isRegistered(tagNameLower)) {
            // Try to determine that this node can be considered a *custom* element; see https://github.com/knockout/knockout/issues/1603
            if (tagNameLower.indexOf('-') != -1 || ('' + node) == "[object HTMLUnknownElement]" || (ko.utils.ieVersion <= 8 && node.tagName === tagNameLower)) {
                return tagNameLower;
            }
        }
    };

    ko.components.addBindingsForCustomElement = function(allBindings, node, bindingContext, valueAccessors) {
        // Determine if it's really a custom element matching a component
        if (node.nodeType === 1) {
            var componentName = ko.components['getComponentNameForNode'](node);
            if (componentName) {
                // It does represent a component, so add a component binding for it
                allBindings = allBindings || {};

                if (allBindings['component']) {
                    // Avoid silently overwriting some other 'component' binding that may already be on the element
                    throw new Error('Cannot use the "component" binding on a custom element matching a component');
                }

                var componentBindingValue = { 'name': componentName, 'params': getComponentParamsFromCustomElement(node, bindingContext) };

                allBindings['component'] = valueAccessors
                    ? function() { return componentBindingValue; }
                    : componentBindingValue;
            }
        }

        return allBindings;
    }

    var nativeBindingProviderInstance = new ko.bindingProvider();

    function getComponentParamsFromCustomElement(elem, bindingContext) {
        var paramsAttribute = elem.getAttribute('params');

        if (paramsAttribute) {
            var params = nativeBindingProviderInstance['parseBindingsString'](paramsAttribute, bindingContext, elem, { 'valueAccessors': true, 'bindingParams': true }),
                rawParamComputedValues = ko.utils.objectMap(params, function(paramValue, paramName) {
                    return ko.computed(paramValue, null, { disposeWhenNodeIsRemoved: elem });
                }),
                result = ko.utils.objectMap(rawParamComputedValues, function(paramValueComputed, paramName) {
                    var paramValue = paramValueComputed.peek();
                    // Does the evaluation of the parameter value unwrap any observables?
                    if (!paramValueComputed.isActive()) {
                        // No it doesn't, so there's no need for any computed wrapper. Just pass through the supplied value directly.
                        // Example: "someVal: firstName, age: 123" (whether or not firstName is an observable/computed)
                        return paramValue;
                    } else {
                        // Yes it does. Supply a computed property that unwraps both the outer (binding expression)
                        // level of observability, and any inner (resulting model value) level of observability.
                        // This means the component doesn't have to worry about multiple unwrapping. If the value is a
                        // writable observable, the computed will also be writable and pass the value on to the observable.
                        return ko.computed({
                            'read': function() {
                                return ko.utils.unwrapObservable(paramValueComputed());
                            },
                            'write': ko.isWriteableObservable(paramValue) && function(value) {
                                paramValueComputed()(value);
                            },
                            disposeWhenNodeIsRemoved: elem
                        });
                    }
                });

            // Give access to the raw computeds, as long as that wouldn't overwrite any custom param also called '$raw'
            // This is in case the developer wants to react to outer (binding) observability separately from inner
            // (model value) observability, or in case the model value observable has subobservables.
            if (!result.hasOwnProperty('$raw')) {
                result['$raw'] = rawParamComputedValues;
            }

            return result;
        } else {
            // For consistency, absence of a "params" attribute is treated the same as the presence of
            // any empty one. Otherwise component viewmodels need special code to check whether or not
            // 'params' or 'params.$raw' is null/undefined before reading subproperties, which is annoying.
            return { '$raw': {} };
        }
    }

    // --------------------------------------------------------------------------------
    // Compatibility code for older (pre-HTML5) IE browsers

    if (ko.utils.ieVersion < 9) {
        // Whenever you preregister a component, enable it as a custom element in the current document
        ko.components['register'] = (function(originalFunction) {
            return function(componentName) {
                document.createElement(componentName); // Allows IE<9 to parse markup containing the custom element
                return originalFunction.apply(this, arguments);
            }
        })(ko.components['register']);

        // Whenever you create a document fragment, enable all preregistered component names as custom elements
        // This is needed to make innerShiv/jQuery HTML parsing correctly handle the custom elements
        document.createDocumentFragment = (function(originalFunction) {
            return function() {
                var newDocFrag = originalFunction(),
                    allComponents = ko.components._allRegisteredComponents;
                for (var componentName in allComponents) {
                    if (allComponents.hasOwnProperty(componentName)) {
                        newDocFrag.createElement(componentName);
                    }
                }
                return newDocFrag;
            };
        })(document.createDocumentFragment);
    }
})();(function(undefined) {

    var componentLoadingOperationUniqueId = 0;

    ko.bindingHandlers['component'] = {
        'init': function(element, valueAccessor, ignored1, ignored2, bindingContext) {
            var currentViewModel,
                currentLoadingOperationId,
                disposeAssociatedComponentViewModel = function () {
                    var currentViewModelDispose = currentViewModel && currentViewModel['dispose'];
                    if (typeof currentViewModelDispose === 'function') {
                        currentViewModelDispose.call(currentViewModel);
                    }
                    currentViewModel = null;
                    // Any in-flight loading operation is no longer relevant, so make sure we ignore its completion
                    currentLoadingOperationId = null;
                },
                originalChildNodes = ko.utils.makeArray(ko.virtualElements.childNodes(element));

            ko.utils.domNodeDisposal.addDisposeCallback(element, disposeAssociatedComponentViewModel);

            ko.computed(function () {
                var value = ko.utils.unwrapObservable(valueAccessor()),
                    componentName, componentParams;

                if (typeof value === 'string') {
                    componentName = value;
                } else {
                    componentName = ko.utils.unwrapObservable(value['name']);
                    componentParams = ko.utils.unwrapObservable(value['params']);
                }

                if (!componentName) {
                    throw new Error('No component name specified');
                }

                var loadingOperationId = currentLoadingOperationId = ++componentLoadingOperationUniqueId;
                ko.components.get(componentName, function(componentDefinition) {
                    // If this is not the current load operation for this element, ignore it.
                    if (currentLoadingOperationId !== loadingOperationId) {
                        return;
                    }

                    // Clean up previous state
                    disposeAssociatedComponentViewModel();

                    // Instantiate and bind new component. Implicitly this cleans any old DOM nodes.
                    if (!componentDefinition) {
                        throw new Error('Unknown component \'' + componentName + '\'');
                    }
                    cloneTemplateIntoElement(componentName, componentDefinition, element);
                    var componentViewModel = createViewModel(componentDefinition, element, originalChildNodes, componentParams),
                        childBindingContext = bindingContext['createChildContext'](componentViewModel, /* dataItemAlias */ undefined, function(ctx) {
                            ctx['$component'] = componentViewModel;
                            ctx['$componentTemplateNodes'] = originalChildNodes;
                        });
                    currentViewModel = componentViewModel;
                    ko.applyBindingsToDescendants(childBindingContext, element);
                });
            }, null, { disposeWhenNodeIsRemoved: element });

            return { 'controlsDescendantBindings': true };
        }
    };

    ko.virtualElements.allowedBindings['component'] = true;

    function cloneTemplateIntoElement(componentName, componentDefinition, element) {
        var template = componentDefinition['template'];
        if (!template) {
            throw new Error('Component \'' + componentName + '\' has no template');
        }

        var clonedNodesArray = ko.utils.cloneNodes(template);
        ko.virtualElements.setDomNodeChildren(element, clonedNodesArray);
    }

    function createViewModel(componentDefinition, element, originalChildNodes, componentParams) {
        var componentViewModelFactory = componentDefinition['createViewModel'];
        return componentViewModelFactory
            ? componentViewModelFactory.call(componentDefinition, componentParams, { 'element': element, 'templateNodes': originalChildNodes })
            : componentParams; // Template-only component
    }

})();
var attrHtmlToJavascriptMap = { 'class': 'className', 'for': 'htmlFor' };
ko.bindingHandlers['attr'] = {
    'update': function(element, valueAccessor, allBindings) {
        var value = ko.utils.unwrapObservable(valueAccessor()) || {};
        ko.utils.objectForEach(value, function(attrName, attrValue) {
            attrValue = ko.utils.unwrapObservable(attrValue);

            // To cover cases like "attr: { checked:someProp }", we want to remove the attribute entirely
            // when someProp is a "no value"-like value (strictly null, false, or undefined)
            // (because the absence of the "checked" attr is how to mark an element as not checked, etc.)
            var toRemove = (attrValue === false) || (attrValue === null) || (attrValue === undefined);
            if (toRemove)
                element.removeAttribute(attrName);

            // In IE <= 7 and IE8 Quirks Mode, you have to use the Javascript property name instead of the
            // HTML attribute name for certain attributes. IE8 Standards Mode supports the correct behavior,
            // but instead of figuring out the mode, we'll just set the attribute through the Javascript
            // property for IE <= 8.
            if (ko.utils.ieVersion <= 8 && attrName in attrHtmlToJavascriptMap) {
                attrName = attrHtmlToJavascriptMap[attrName];
                if (toRemove)
                    element.removeAttribute(attrName);
                else
                    element[attrName] = attrValue;
            } else if (!toRemove) {
                element.setAttribute(attrName, attrValue.toString());
            }

            // Treat "name" specially - although you can think of it as an attribute, it also needs
            // special handling on older versions of IE (https://github.com/SteveSanderson/knockout/pull/333)
            // Deliberately being case-sensitive here because XHTML would regard "Name" as a different thing
            // entirely, and there's no strong reason to allow for such casing in HTML.
            if (attrName === "name") {
                ko.utils.setElementName(element, toRemove ? "" : attrValue.toString());
            }
        });
    }
};
(function() {

ko.bindingHandlers['checked'] = {
    'after': ['value', 'attr'],
    'init': function (element, valueAccessor, allBindings) {
        var checkedValue = ko.pureComputed(function() {
            // Treat "value" like "checkedValue" when it is included with "checked" binding
            if (allBindings['has']('checkedValue')) {
                return ko.utils.unwrapObservable(allBindings.get('checkedValue'));
            } else if (allBindings['has']('value')) {
                return ko.utils.unwrapObservable(allBindings.get('value'));
            }

            return element.value;
        });

        function updateModel() {
            // This updates the model value from the view value.
            // It runs in response to DOM events (click) and changes in checkedValue.
            var isChecked = element.checked,
                elemValue = useCheckedValue ? checkedValue() : isChecked;

            // When we're first setting up this computed, don't change any model state.
            if (ko.computedContext.isInitial()) {
                return;
            }

            // We can ignore unchecked radio buttons, because some other radio
            // button will be getting checked, and that one can take care of updating state.
            if (isRadio && !isChecked) {
                return;
            }

            var modelValue = ko.dependencyDetection.ignore(valueAccessor);
            if (valueIsArray) {
                var writableValue = rawValueIsNonArrayObservable ? modelValue.peek() : modelValue;
                if (oldElemValue !== elemValue) {
                    // When we're responding to the checkedValue changing, and the element is
                    // currently checked, replace the old elem value with the new elem value
                    // in the model array.
                    if (isChecked) {
                        ko.utils.addOrRemoveItem(writableValue, elemValue, true);
                        ko.utils.addOrRemoveItem(writableValue, oldElemValue, false);
                    }

                    oldElemValue = elemValue;
                } else {
                    // When we're responding to the user having checked/unchecked a checkbox,
                    // add/remove the element value to the model array.
                    ko.utils.addOrRemoveItem(writableValue, elemValue, isChecked);
                }
                if (rawValueIsNonArrayObservable && ko.isWriteableObservable(modelValue)) {
                    modelValue(writableValue);
                }
            } else {
                ko.expressionRewriting.writeValueToProperty(modelValue, allBindings, 'checked', elemValue, true);
            }
        };

        function updateView() {
            // This updates the view value from the model value.
            // It runs in response to changes in the bound (checked) value.
            var modelValue = ko.utils.unwrapObservable(valueAccessor());

            if (valueIsArray) {
                // When a checkbox is bound to an array, being checked represents its value being present in that array
                element.checked = ko.utils.arrayIndexOf(modelValue, checkedValue()) >= 0;
            } else if (isCheckbox) {
                // When a checkbox is bound to any other value (not an array), being checked represents the value being trueish
                element.checked = modelValue;
            } else {
                // For radio buttons, being checked means that the radio button's value corresponds to the model value
                element.checked = (checkedValue() === modelValue);
            }
        };

        var isCheckbox = element.type == "checkbox",
            isRadio = element.type == "radio";

        // Only bind to check boxes and radio buttons
        if (!isCheckbox && !isRadio) {
            return;
        }

        var rawValue = valueAccessor(),
            valueIsArray = isCheckbox && (ko.utils.unwrapObservable(rawValue) instanceof Array),
            rawValueIsNonArrayObservable = !(valueIsArray && rawValue.push && rawValue.splice),
            oldElemValue = valueIsArray ? checkedValue() : undefined,
            useCheckedValue = isRadio || valueIsArray;

        // IE 6 won't allow radio buttons to be selected unless they have a name
        if (isRadio && !element.name)
            ko.bindingHandlers['uniqueName']['init'](element, function() { return true });

        // Set up two computeds to update the binding:

        // The first responds to changes in the checkedValue value and to element clicks
        ko.computed(updateModel, null, { disposeWhenNodeIsRemoved: element });
        ko.utils.registerEventHandler(element, "click", updateModel);

        // The second responds to changes in the model value (the one associated with the checked binding)
        ko.computed(updateView, null, { disposeWhenNodeIsRemoved: element });

        rawValue = undefined;
    }
};
ko.expressionRewriting.twoWayBindings['checked'] = true;

ko.bindingHandlers['checkedValue'] = {
    'update': function (element, valueAccessor) {
        element.value = ko.utils.unwrapObservable(valueAccessor());
    }
};

})();var classesWrittenByBindingKey = '__ko__cssValue';
ko.bindingHandlers['css'] = {
    'update': function (element, valueAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor());
        if (value !== null && typeof value == "object") {
            ko.utils.objectForEach(value, function(className, shouldHaveClass) {
                shouldHaveClass = ko.utils.unwrapObservable(shouldHaveClass);
                ko.utils.toggleDomNodeCssClass(element, className, shouldHaveClass);
            });
        } else {
            value = ko.utils.stringTrim(String(value || '')); // Make sure we don't try to store or set a non-string value
            ko.utils.toggleDomNodeCssClass(element, element[classesWrittenByBindingKey], false);
            element[classesWrittenByBindingKey] = value;
            ko.utils.toggleDomNodeCssClass(element, value, true);
        }
    }
};
ko.bindingHandlers['enable'] = {
    'update': function (element, valueAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor());
        if (value && element.disabled)
            element.removeAttribute("disabled");
        else if ((!value) && (!element.disabled))
            element.disabled = true;
    }
};

ko.bindingHandlers['disable'] = {
    'update': function (element, valueAccessor) {
        ko.bindingHandlers['enable']['update'](element, function() { return !ko.utils.unwrapObservable(valueAccessor()) });
    }
};
// For certain common events (currently just 'click'), allow a simplified data-binding syntax
// e.g. click:handler instead of the usual full-length event:{click:handler}
function makeEventHandlerShortcut(eventName) {
    ko.bindingHandlers[eventName] = {
        'init': function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            var newValueAccessor = function () {
                var result = {};
                result[eventName] = valueAccessor();
                return result;
            };
            return ko.bindingHandlers['event']['init'].call(this, element, newValueAccessor, allBindings, viewModel, bindingContext);
        }
    }
}

ko.bindingHandlers['event'] = {
    'init' : function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        var eventsToHandle = valueAccessor() || {};
        ko.utils.objectForEach(eventsToHandle, function(eventName) {
            if (typeof eventName == "string") {
                ko.utils.registerEventHandler(element, eventName, function (event) {
                    var handlerReturnValue;
                    var handlerFunction = valueAccessor()[eventName];
                    if (!handlerFunction)
                        return;

                    try {
                        // Take all the event args, and prefix with the viewmodel
                        var argsForHandler = ko.utils.makeArray(arguments);
                        viewModel = bindingContext['$data'];
                        argsForHandler.unshift(viewModel);
                        handlerReturnValue = handlerFunction.apply(viewModel, argsForHandler);
                    } finally {
                        if (handlerReturnValue !== true) { // Normally we want to prevent default action. Developer can override this be explicitly returning true.
                            if (event.preventDefault)
                                event.preventDefault();
                            else
                                event.returnValue = false;
                        }
                    }

                    var bubble = allBindings.get(eventName + 'Bubble') !== false;
                    if (!bubble) {
                        event.cancelBubble = true;
                        if (event.stopPropagation)
                            event.stopPropagation();
                    }
                });
            }
        });
    }
};
// "foreach: someExpression" is equivalent to "template: { foreach: someExpression }"
// "foreach: { data: someExpression, afterAdd: myfn }" is equivalent to "template: { foreach: someExpression, afterAdd: myfn }"
ko.bindingHandlers['foreach'] = {
    makeTemplateValueAccessor: function(valueAccessor) {
        return function() {
            var modelValue = valueAccessor(),
                unwrappedValue = ko.utils.peekObservable(modelValue);    // Unwrap without setting a dependency here

            // If unwrappedValue is the array, pass in the wrapped value on its own
            // The value will be unwrapped and tracked within the template binding
            // (See https://github.com/SteveSanderson/knockout/issues/523)
            if ((!unwrappedValue) || typeof unwrappedValue.length == "number")
                return { 'foreach': modelValue, 'templateEngine': ko.nativeTemplateEngine.instance };

            // If unwrappedValue.data is the array, preserve all relevant options and unwrap again value so we get updates
            ko.utils.unwrapObservable(modelValue);
            return {
                'foreach': unwrappedValue['data'],
                'as': unwrappedValue['as'],
                'includeDestroyed': unwrappedValue['includeDestroyed'],
                'afterAdd': unwrappedValue['afterAdd'],
                'beforeRemove': unwrappedValue['beforeRemove'],
                'afterRender': unwrappedValue['afterRender'],
                'beforeMove': unwrappedValue['beforeMove'],
                'afterMove': unwrappedValue['afterMove'],
                'templateEngine': ko.nativeTemplateEngine.instance
            };
        };
    },
    'init': function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        return ko.bindingHandlers['template']['init'](element, ko.bindingHandlers['foreach'].makeTemplateValueAccessor(valueAccessor));
    },
    'update': function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        return ko.bindingHandlers['template']['update'](element, ko.bindingHandlers['foreach'].makeTemplateValueAccessor(valueAccessor), allBindings, viewModel, bindingContext);
    }
};
ko.expressionRewriting.bindingRewriteValidators['foreach'] = false; // Can't rewrite control flow bindings
ko.virtualElements.allowedBindings['foreach'] = true;
var hasfocusUpdatingProperty = '__ko_hasfocusUpdating';
var hasfocusLastValue = '__ko_hasfocusLastValue';
ko.bindingHandlers['hasfocus'] = {
    'init': function(element, valueAccessor, allBindings) {
        var handleElementFocusChange = function(isFocused) {
            // Where possible, ignore which event was raised and determine focus state using activeElement,
            // as this avoids phantom focus/blur events raised when changing tabs in modern browsers.
            // However, not all KO-targeted browsers (Firefox 2) support activeElement. For those browsers,
            // prevent a loss of focus when changing tabs/windows by setting a flag that prevents hasfocus
            // from calling 'blur()' on the element when it loses focus.
            // Discussion at https://github.com/SteveSanderson/knockout/pull/352
            element[hasfocusUpdatingProperty] = true;
            var ownerDoc = element.ownerDocument;
            if ("activeElement" in ownerDoc) {
                var active;
                try {
                    active = ownerDoc.activeElement;
                } catch(e) {
                    // IE9 throws if you access activeElement during page load (see issue #703)
                    active = ownerDoc.body;
                }
                isFocused = (active === element);
            }
            var modelValue = valueAccessor();
            ko.expressionRewriting.writeValueToProperty(modelValue, allBindings, 'hasfocus', isFocused, true);

            //cache the latest value, so we can avoid unnecessarily calling focus/blur in the update function
            element[hasfocusLastValue] = isFocused;
            element[hasfocusUpdatingProperty] = false;
        };
        var handleElementFocusIn = handleElementFocusChange.bind(null, true);
        var handleElementFocusOut = handleElementFocusChange.bind(null, false);

        ko.utils.registerEventHandler(element, "focus", handleElementFocusIn);
        ko.utils.registerEventHandler(element, "focusin", handleElementFocusIn); // For IE
        ko.utils.registerEventHandler(element, "blur",  handleElementFocusOut);
        ko.utils.registerEventHandler(element, "focusout",  handleElementFocusOut); // For IE
    },
    'update': function(element, valueAccessor) {
        var value = !!ko.utils.unwrapObservable(valueAccessor());

        if (!element[hasfocusUpdatingProperty] && element[hasfocusLastValue] !== value) {
            value ? element.focus() : element.blur();

            // In IE, the blur method doesn't always cause the element to lose focus (for example, if the window is not in focus).
            // Setting focus to the body element does seem to be reliable in IE, but should only be used if we know that the current
            // element was focused already.
            if (!value && element[hasfocusLastValue]) {
                element.ownerDocument.body.focus();
            }

            // For IE, which doesn't reliably fire "focus" or "blur" events synchronously
            ko.dependencyDetection.ignore(ko.utils.triggerEvent, null, [element, value ? "focusin" : "focusout"]);
        }
    }
};
ko.expressionRewriting.twoWayBindings['hasfocus'] = true;

ko.bindingHandlers['hasFocus'] = ko.bindingHandlers['hasfocus']; // Make "hasFocus" an alias
ko.expressionRewriting.twoWayBindings['hasFocus'] = true;
ko.bindingHandlers['html'] = {
    'init': function() {
        // Prevent binding on the dynamically-injected HTML (as developers are unlikely to expect that, and it has security implications)
        return { 'controlsDescendantBindings': true };
    },
    'update': function (element, valueAccessor) {
        // setHtml will unwrap the value if needed
        ko.utils.setHtml(element, valueAccessor());
    }
};
// Makes a binding like with or if
function makeWithIfBinding(bindingKey, isWith, isNot, makeContextCallback) {
    ko.bindingHandlers[bindingKey] = {
        'init': function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            var didDisplayOnLastUpdate,
                savedNodes;
            ko.computed(function() {
                var dataValue = ko.utils.unwrapObservable(valueAccessor()),
                    shouldDisplay = !isNot !== !dataValue, // equivalent to isNot ? !dataValue : !!dataValue
                    isFirstRender = !savedNodes,
                    needsRefresh = isFirstRender || isWith || (shouldDisplay !== didDisplayOnLastUpdate);

                if (needsRefresh) {
                    // Save a copy of the inner nodes on the initial update, but only if we have dependencies.
                    if (isFirstRender && ko.computedContext.getDependenciesCount()) {
                        savedNodes = ko.utils.cloneNodes(ko.virtualElements.childNodes(element), true /* shouldCleanNodes */);
                    }

                    if (shouldDisplay) {
                        if (!isFirstRender) {
                            ko.virtualElements.setDomNodeChildren(element, ko.utils.cloneNodes(savedNodes));
                        }
                        ko.applyBindingsToDescendants(makeContextCallback ? makeContextCallback(bindingContext, dataValue) : bindingContext, element);
                    } else {
                        ko.virtualElements.emptyNode(element);
                    }

                    didDisplayOnLastUpdate = shouldDisplay;
                }
            }, null, { disposeWhenNodeIsRemoved: element });
            return { 'controlsDescendantBindings': true };
        }
    };
    ko.expressionRewriting.bindingRewriteValidators[bindingKey] = false; // Can't rewrite control flow bindings
    ko.virtualElements.allowedBindings[bindingKey] = true;
}

// Construct the actual binding handlers
makeWithIfBinding('if');
makeWithIfBinding('ifnot', false /* isWith */, true /* isNot */);
makeWithIfBinding('with', true /* isWith */, false /* isNot */,
    function(bindingContext, dataValue) {
        return bindingContext['createChildContext'](dataValue);
    }
);
var captionPlaceholder = {};
ko.bindingHandlers['options'] = {
    'init': function(element) {
        if (ko.utils.tagNameLower(element) !== "select")
            throw new Error("options binding applies only to SELECT elements");

        // Remove all existing <option>s.
        while (element.length > 0) {
            element.remove(0);
        }

        // Ensures that the binding processor doesn't try to bind the options
        return { 'controlsDescendantBindings': true };
    },
    'update': function (element, valueAccessor, allBindings) {
        function selectedOptions() {
            return ko.utils.arrayFilter(element.options, function (node) { return node.selected; });
        }

        var selectWasPreviouslyEmpty = element.length == 0,
            multiple = element.multiple,
            previousScrollTop = (!selectWasPreviouslyEmpty && multiple) ? element.scrollTop : null,
            unwrappedArray = ko.utils.unwrapObservable(valueAccessor()),
            valueAllowUnset = allBindings.get('valueAllowUnset') && allBindings['has']('value'),
            includeDestroyed = allBindings.get('optionsIncludeDestroyed'),
            arrayToDomNodeChildrenOptions = {},
            captionValue,
            filteredArray,
            previousSelectedValues = [];

        if (!valueAllowUnset) {
            if (multiple) {
                previousSelectedValues = ko.utils.arrayMap(selectedOptions(), ko.selectExtensions.readValue);
            } else if (element.selectedIndex >= 0) {
                previousSelectedValues.push(ko.selectExtensions.readValue(element.options[element.selectedIndex]));
            }
        }

        if (unwrappedArray) {
            if (typeof unwrappedArray.length == "undefined") // Coerce single value into array
                unwrappedArray = [unwrappedArray];

            // Filter out any entries marked as destroyed
            filteredArray = ko.utils.arrayFilter(unwrappedArray, function(item) {
                return includeDestroyed || item === undefined || item === null || !ko.utils.unwrapObservable(item['_destroy']);
            });

            // If caption is included, add it to the array
            if (allBindings['has']('optionsCaption')) {
                captionValue = ko.utils.unwrapObservable(allBindings.get('optionsCaption'));
                // If caption value is null or undefined, don't show a caption
                if (captionValue !== null && captionValue !== undefined) {
                    filteredArray.unshift(captionPlaceholder);
                }
            }
        } else {
            // If a falsy value is provided (e.g. null), we'll simply empty the select element
        }

        function applyToObject(object, predicate, defaultValue) {
            var predicateType = typeof predicate;
            if (predicateType == "function")    // Given a function; run it against the data value
                return predicate(object);
            else if (predicateType == "string") // Given a string; treat it as a property name on the data value
                return object[predicate];
            else                                // Given no optionsText arg; use the data value itself
                return defaultValue;
        }

        // The following functions can run at two different times:
        // The first is when the whole array is being updated directly from this binding handler.
        // The second is when an observable value for a specific array entry is updated.
        // oldOptions will be empty in the first case, but will be filled with the previously generated option in the second.
        var itemUpdate = false;
        function optionForArrayItem(arrayEntry, index, oldOptions) {
            if (oldOptions.length) {
                previousSelectedValues = !valueAllowUnset && oldOptions[0].selected ? [ ko.selectExtensions.readValue(oldOptions[0]) ] : [];
                itemUpdate = true;
            }
            var option = element.ownerDocument.createElement("option");
            if (arrayEntry === captionPlaceholder) {
                ko.utils.setTextContent(option, allBindings.get('optionsCaption'));
                ko.selectExtensions.writeValue(option, undefined);
            } else {
                // Apply a value to the option element
                var optionValue = applyToObject(arrayEntry, allBindings.get('optionsValue'), arrayEntry);
                ko.selectExtensions.writeValue(option, ko.utils.unwrapObservable(optionValue));

                // Apply some text to the option element
                var optionText = applyToObject(arrayEntry, allBindings.get('optionsText'), optionValue);
                ko.utils.setTextContent(option, optionText);
            }
            return [option];
        }

        // By using a beforeRemove callback, we delay the removal until after new items are added. This fixes a selection
        // problem in IE<=8 and Firefox. See https://github.com/knockout/knockout/issues/1208
        arrayToDomNodeChildrenOptions['beforeRemove'] =
            function (option) {
                element.removeChild(option);
            };

        function setSelectionCallback(arrayEntry, newOptions) {
            if (itemUpdate && valueAllowUnset) {
                // The model value is authoritative, so make sure its value is the one selected
                // There is no need to use dependencyDetection.ignore since setDomNodeChildrenFromArrayMapping does so already.
                ko.selectExtensions.writeValue(element, ko.utils.unwrapObservable(allBindings.get('value')), true /* allowUnset */);
            } else if (previousSelectedValues.length) {
                // IE6 doesn't like us to assign selection to OPTION nodes before they're added to the document.
                // That's why we first added them without selection. Now it's time to set the selection.
                var isSelected = ko.utils.arrayIndexOf(previousSelectedValues, ko.selectExtensions.readValue(newOptions[0])) >= 0;
                ko.utils.setOptionNodeSelectionState(newOptions[0], isSelected);

                // If this option was changed from being selected during a single-item update, notify the change
                if (itemUpdate && !isSelected) {
                    ko.dependencyDetection.ignore(ko.utils.triggerEvent, null, [element, "change"]);
                }
            }
        }

        var callback = setSelectionCallback;
        if (allBindings['has']('optionsAfterRender') && typeof allBindings.get('optionsAfterRender') == "function") {
            callback = function(arrayEntry, newOptions) {
                setSelectionCallback(arrayEntry, newOptions);
                ko.dependencyDetection.ignore(allBindings.get('optionsAfterRender'), null, [newOptions[0], arrayEntry !== captionPlaceholder ? arrayEntry : undefined]);
            }
        }

        ko.utils.setDomNodeChildrenFromArrayMapping(element, filteredArray, optionForArrayItem, arrayToDomNodeChildrenOptions, callback);

        ko.dependencyDetection.ignore(function () {
            if (valueAllowUnset) {
                // The model value is authoritative, so make sure its value is the one selected
                ko.selectExtensions.writeValue(element, ko.utils.unwrapObservable(allBindings.get('value')), true /* allowUnset */);
            } else {
                // Determine if the selection has changed as a result of updating the options list
                var selectionChanged;
                if (multiple) {
                    // For a multiple-select box, compare the new selection count to the previous one
                    // But if nothing was selected before, the selection can't have changed
                    selectionChanged = previousSelectedValues.length && selectedOptions().length < previousSelectedValues.length;
                } else {
                    // For a single-select box, compare the current value to the previous value
                    // But if nothing was selected before or nothing is selected now, just look for a change in selection
                    selectionChanged = (previousSelectedValues.length && element.selectedIndex >= 0)
                        ? (ko.selectExtensions.readValue(element.options[element.selectedIndex]) !== previousSelectedValues[0])
                        : (previousSelectedValues.length || element.selectedIndex >= 0);
                }

                // Ensure consistency between model value and selected option.
                // If the dropdown was changed so that selection is no longer the same,
                // notify the value or selectedOptions binding.
                if (selectionChanged) {
                    ko.utils.triggerEvent(element, "change");
                }
            }
        });

        // Workaround for IE bug
        ko.utils.ensureSelectElementIsRenderedCorrectly(element);

        if (previousScrollTop && Math.abs(previousScrollTop - element.scrollTop) > 20)
            element.scrollTop = previousScrollTop;
    }
};
ko.bindingHandlers['options'].optionValueDomDataKey = ko.utils.domData.nextKey();
ko.bindingHandlers['selectedOptions'] = {
    'after': ['options', 'foreach'],
    'init': function (element, valueAccessor, allBindings) {
        ko.utils.registerEventHandler(element, "change", function () {
            var value = valueAccessor(), valueToWrite = [];
            ko.utils.arrayForEach(element.getElementsByTagName("option"), function(node) {
                if (node.selected)
                    valueToWrite.push(ko.selectExtensions.readValue(node));
            });
            ko.expressionRewriting.writeValueToProperty(value, allBindings, 'selectedOptions', valueToWrite);
        });
    },
    'update': function (element, valueAccessor) {
        if (ko.utils.tagNameLower(element) != "select")
            throw new Error("values binding applies only to SELECT elements");

        var newValue = ko.utils.unwrapObservable(valueAccessor()),
            previousScrollTop = element.scrollTop;

        if (newValue && typeof newValue.length == "number") {
            ko.utils.arrayForEach(element.getElementsByTagName("option"), function(node) {
                var isSelected = ko.utils.arrayIndexOf(newValue, ko.selectExtensions.readValue(node)) >= 0;
                if (node.selected != isSelected) {      // This check prevents flashing of the select element in IE
                    ko.utils.setOptionNodeSelectionState(node, isSelected);
                }
            });
        }

        element.scrollTop = previousScrollTop;
    }
};
ko.expressionRewriting.twoWayBindings['selectedOptions'] = true;
ko.bindingHandlers['style'] = {
    'update': function (element, valueAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor() || {});
        ko.utils.objectForEach(value, function(styleName, styleValue) {
            styleValue = ko.utils.unwrapObservable(styleValue);

            if (styleValue === null || styleValue === undefined || styleValue === false) {
                // Empty string removes the value, whereas null/undefined have no effect
                styleValue = "";
            }

            element.style[styleName] = styleValue;
        });
    }
};
ko.bindingHandlers['submit'] = {
    'init': function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        if (typeof valueAccessor() != "function")
            throw new Error("The value for a submit binding must be a function");
        ko.utils.registerEventHandler(element, "submit", function (event) {
            var handlerReturnValue;
            var value = valueAccessor();
            try { handlerReturnValue = value.call(bindingContext['$data'], element); }
            finally {
                if (handlerReturnValue !== true) { // Normally we want to prevent default action. Developer can override this be explicitly returning true.
                    if (event.preventDefault)
                        event.preventDefault();
                    else
                        event.returnValue = false;
                }
            }
        });
    }
};
ko.bindingHandlers['text'] = {
    'init': function() {
        // Prevent binding on the dynamically-injected text node (as developers are unlikely to expect that, and it has security implications).
        // It should also make things faster, as we no longer have to consider whether the text node might be bindable.
        return { 'controlsDescendantBindings': true };
    },
    'update': function (element, valueAccessor) {
        ko.utils.setTextContent(element, valueAccessor());
    }
};
ko.virtualElements.allowedBindings['text'] = true;
(function () {

if (window && window.navigator) {
    var parseVersion = function (matches) {
        if (matches) {
            return parseFloat(matches[1]);
        }
    };

    // Detect various browser versions because some old versions don't fully support the 'input' event
    var operaVersion = window.opera && window.opera.version && parseInt(window.opera.version()),
        userAgent = window.navigator.userAgent,
        safariVersion = parseVersion(userAgent.match(/^(?:(?!chrome).)*version\/([^ ]*) safari/i)),
        firefoxVersion = parseVersion(userAgent.match(/Firefox\/([^ ]*)/));
}

// IE 8 and 9 have bugs that prevent the normal events from firing when the value changes.
// But it does fire the 'selectionchange' event on many of those, presumably because the
// cursor is moving and that counts as the selection changing. The 'selectionchange' event is
// fired at the document level only and doesn't directly indicate which element changed. We
// set up just one event handler for the document and use 'activeElement' to determine which
// element was changed.
if (ko.utils.ieVersion < 10) {
    var selectionChangeRegisteredName = ko.utils.domData.nextKey(),
        selectionChangeHandlerName = ko.utils.domData.nextKey();
    var selectionChangeHandler = function(event) {
        var target = this.activeElement,
            handler = target && ko.utils.domData.get(target, selectionChangeHandlerName);
        if (handler) {
            handler(event);
        }
    };
    var registerForSelectionChangeEvent = function (element, handler) {
        var ownerDoc = element.ownerDocument;
        if (!ko.utils.domData.get(ownerDoc, selectionChangeRegisteredName)) {
            ko.utils.domData.set(ownerDoc, selectionChangeRegisteredName, true);
            ko.utils.registerEventHandler(ownerDoc, 'selectionchange', selectionChangeHandler);
        }
        ko.utils.domData.set(element, selectionChangeHandlerName, handler);
    };
}

ko.bindingHandlers['textInput'] = {
    'init': function (element, valueAccessor, allBindings) {

        var previousElementValue = element.value,
            timeoutHandle,
            elementValueBeforeEvent;

        var updateModel = function (event) {
            clearTimeout(timeoutHandle);
            elementValueBeforeEvent = timeoutHandle = undefined;

            var elementValue = element.value;
            if (previousElementValue !== elementValue) {
                // Provide a way for tests to know exactly which event was processed
                if (DEBUG && event) element['_ko_textInputProcessedEvent'] = event.type;
                previousElementValue = elementValue;
                ko.expressionRewriting.writeValueToProperty(valueAccessor(), allBindings, 'textInput', elementValue);
            }
        };

        var deferUpdateModel = function (event) {
            if (!timeoutHandle) {
                // The elementValueBeforeEvent variable is set *only* during the brief gap between an
                // event firing and the updateModel function running. This allows us to ignore model
                // updates that are from the previous state of the element, usually due to techniques
                // such as rateLimit. Such updates, if not ignored, can cause keystrokes to be lost.
                elementValueBeforeEvent = element.value;
                var handler = DEBUG ? updateModel.bind(element, {type: event.type}) : updateModel;
                timeoutHandle = ko.utils.setTimeout(handler, 4);
            }
        };

        // IE9 will mess up the DOM if you handle events synchronously which results in DOM changes (such as other bindings);
        // so we'll make sure all updates are asynchronous
        var ieUpdateModel = ko.utils.ieVersion == 9 ? deferUpdateModel : updateModel;

        var updateView = function () {
            var modelValue = ko.utils.unwrapObservable(valueAccessor());

            if (modelValue === null || modelValue === undefined) {
                modelValue = '';
            }

            if (elementValueBeforeEvent !== undefined && modelValue === elementValueBeforeEvent) {
                ko.utils.setTimeout(updateView, 4);
                return;
            }

            // Update the element only if the element and model are different. On some browsers, updating the value
            // will move the cursor to the end of the input, which would be bad while the user is typing.
            if (element.value !== modelValue) {
                previousElementValue = modelValue;  // Make sure we ignore events (propertychange) that result from updating the value
                element.value = modelValue;
            }
        };

        var onEvent = function (event, handler) {
            ko.utils.registerEventHandler(element, event, handler);
        };

        if (DEBUG && ko.bindingHandlers['textInput']['_forceUpdateOn']) {
            // Provide a way for tests to specify exactly which events are bound
            ko.utils.arrayForEach(ko.bindingHandlers['textInput']['_forceUpdateOn'], function(eventName) {
                if (eventName.slice(0,5) == 'after') {
                    onEvent(eventName.slice(5), deferUpdateModel);
                } else {
                    onEvent(eventName, updateModel);
                }
            });
        } else {
            if (ko.utils.ieVersion < 10) {
                // Internet Explorer <= 8 doesn't support the 'input' event, but does include 'propertychange' that fires whenever
                // any property of an element changes. Unlike 'input', it also fires if a property is changed from JavaScript code,
                // but that's an acceptable compromise for this binding. IE 9 does support 'input', but since it doesn't fire it
                // when using autocomplete, we'll use 'propertychange' for it also.
                onEvent('propertychange', function(event) {
                    if (event.propertyName === 'value') {
                        ieUpdateModel(event);
                    }
                });

                if (ko.utils.ieVersion == 8) {
                    // IE 8 has a bug where it fails to fire 'propertychange' on the first update following a value change from
                    // JavaScript code. It also doesn't fire if you clear the entire value. To fix this, we bind to the following
                    // events too.
                    onEvent('keyup', updateModel);      // A single keystoke
                    onEvent('keydown', updateModel);    // The first character when a key is held down
                }
                if (ko.utils.ieVersion >= 8) {
                    // Internet Explorer 9 doesn't fire the 'input' event when deleting text, including using
                    // the backspace, delete, or ctrl-x keys, clicking the 'x' to clear the input, dragging text
                    // out of the field, and cutting or deleting text using the context menu. 'selectionchange'
                    // can detect all of those except dragging text out of the field, for which we use 'dragend'.
                    // These are also needed in IE8 because of the bug described above.
                    registerForSelectionChangeEvent(element, ieUpdateModel);  // 'selectionchange' covers cut, paste, drop, delete, etc.
                    onEvent('dragend', deferUpdateModel);
                }
            } else {
                // All other supported browsers support the 'input' event, which fires whenever the content of the element is changed
                // through the user interface.
                onEvent('input', updateModel);

                if (safariVersion < 5 && ko.utils.tagNameLower(element) === "textarea") {
                    // Safari <5 doesn't fire the 'input' event for <textarea> elements (it does fire 'textInput'
                    // but only when typing). So we'll just catch as much as we can with keydown, cut, and paste.
                    onEvent('keydown', deferUpdateModel);
                    onEvent('paste', deferUpdateModel);
                    onEvent('cut', deferUpdateModel);
                } else if (operaVersion < 11) {
                    // Opera 10 doesn't always fire the 'input' event for cut, paste, undo & drop operations.
                    // We can try to catch some of those using 'keydown'.
                    onEvent('keydown', deferUpdateModel);
                } else if (firefoxVersion < 4.0) {
                    // Firefox <= 3.6 doesn't fire the 'input' event when text is filled in through autocomplete
                    onEvent('DOMAutoComplete', updateModel);

                    // Firefox <=3.5 doesn't fire the 'input' event when text is dropped into the input.
                    onEvent('dragdrop', updateModel);       // <3.5
                    onEvent('drop', updateModel);           // 3.5
                }
            }
        }

        // Bind to the change event so that we can catch programmatic updates of the value that fire this event.
        onEvent('change', updateModel);

        ko.computed(updateView, null, { disposeWhenNodeIsRemoved: element });
    }
};
ko.expressionRewriting.twoWayBindings['textInput'] = true;

// textinput is an alias for textInput
ko.bindingHandlers['textinput'] = {
    // preprocess is the only way to set up a full alias
    'preprocess': function (value, name, addBinding) {
        addBinding('textInput', value);
    }
};

})();ko.bindingHandlers['uniqueName'] = {
    'init': function (element, valueAccessor) {
        if (valueAccessor()) {
            var name = "ko_unique_" + (++ko.bindingHandlers['uniqueName'].currentIndex);
            ko.utils.setElementName(element, name);
        }
    }
};
ko.bindingHandlers['uniqueName'].currentIndex = 0;
ko.bindingHandlers['value'] = {
    'after': ['options', 'foreach'],
    'init': function (element, valueAccessor, allBindings) {
        // If the value binding is placed on a radio/checkbox, then just pass through to checkedValue and quit
        if (element.tagName.toLowerCase() == "input" && (element.type == "checkbox" || element.type == "radio")) {
            ko.applyBindingAccessorsToNode(element, { 'checkedValue': valueAccessor });
            return;
        }

        // Always catch "change" event; possibly other events too if asked
        var eventsToCatch = ["change"];
        var requestedEventsToCatch = allBindings.get("valueUpdate");
        var propertyChangedFired = false;
        var elementValueBeforeEvent = null;

        if (requestedEventsToCatch) {
            if (typeof requestedEventsToCatch == "string") // Allow both individual event names, and arrays of event names
                requestedEventsToCatch = [requestedEventsToCatch];
            ko.utils.arrayPushAll(eventsToCatch, requestedEventsToCatch);
            eventsToCatch = ko.utils.arrayGetDistinctValues(eventsToCatch);
        }

        var valueUpdateHandler = function() {
            elementValueBeforeEvent = null;
            propertyChangedFired = false;
            var modelValue = valueAccessor();
            var elementValue = ko.selectExtensions.readValue(element);
            ko.expressionRewriting.writeValueToProperty(modelValue, allBindings, 'value', elementValue);
        }

        // Workaround for https://github.com/SteveSanderson/knockout/issues/122
        // IE doesn't fire "change" events on textboxes if the user selects a value from its autocomplete list
        var ieAutoCompleteHackNeeded = ko.utils.ieVersion && element.tagName.toLowerCase() == "input" && element.type == "text"
                                       && element.autocomplete != "off" && (!element.form || element.form.autocomplete != "off");
        if (ieAutoCompleteHackNeeded && ko.utils.arrayIndexOf(eventsToCatch, "propertychange") == -1) {
            ko.utils.registerEventHandler(element, "propertychange", function () { propertyChangedFired = true });
            ko.utils.registerEventHandler(element, "focus", function () { propertyChangedFired = false });
            ko.utils.registerEventHandler(element, "blur", function() {
                if (propertyChangedFired) {
                    valueUpdateHandler();
                }
            });
        }

        ko.utils.arrayForEach(eventsToCatch, function(eventName) {
            // The syntax "after<eventname>" means "run the handler asynchronously after the event"
            // This is useful, for example, to catch "keydown" events after the browser has updated the control
            // (otherwise, ko.selectExtensions.readValue(this) will receive the control's value *before* the key event)
            var handler = valueUpdateHandler;
            if (ko.utils.stringStartsWith(eventName, "after")) {
                handler = function() {
                    // The elementValueBeforeEvent variable is non-null *only* during the brief gap between
                    // a keyX event firing and the valueUpdateHandler running, which is scheduled to happen
                    // at the earliest asynchronous opportunity. We store this temporary information so that
                    // if, between keyX and valueUpdateHandler, the underlying model value changes separately,
                    // we can overwrite that model value change with the value the user just typed. Otherwise,
                    // techniques like rateLimit can trigger model changes at critical moments that will
                    // override the user's inputs, causing keystrokes to be lost.
                    elementValueBeforeEvent = ko.selectExtensions.readValue(element);
                    ko.utils.setTimeout(valueUpdateHandler, 0);
                };
                eventName = eventName.substring("after".length);
            }
            ko.utils.registerEventHandler(element, eventName, handler);
        });

        var updateFromModel = function () {
            var newValue = ko.utils.unwrapObservable(valueAccessor());
            var elementValue = ko.selectExtensions.readValue(element);

            if (elementValueBeforeEvent !== null && newValue === elementValueBeforeEvent) {
                ko.utils.setTimeout(updateFromModel, 0);
                return;
            }

            var valueHasChanged = (newValue !== elementValue);

            if (valueHasChanged) {
                if (ko.utils.tagNameLower(element) === "select") {
                    var allowUnset = allBindings.get('valueAllowUnset');
                    var applyValueAction = function () {
                        ko.selectExtensions.writeValue(element, newValue, allowUnset);
                    };
                    applyValueAction();

                    if (!allowUnset && newValue !== ko.selectExtensions.readValue(element)) {
                        // If you try to set a model value that can't be represented in an already-populated dropdown, reject that change,
                        // because you're not allowed to have a model value that disagrees with a visible UI selection.
                        ko.dependencyDetection.ignore(ko.utils.triggerEvent, null, [element, "change"]);
                    } else {
                        // Workaround for IE6 bug: It won't reliably apply values to SELECT nodes during the same execution thread
                        // right after you've changed the set of OPTION nodes on it. So for that node type, we'll schedule a second thread
                        // to apply the value as well.
                        ko.utils.setTimeout(applyValueAction, 0);
                    }
                } else {
                    ko.selectExtensions.writeValue(element, newValue);
                }
            }
        };

        ko.computed(updateFromModel, null, { disposeWhenNodeIsRemoved: element });
    },
    'update': function() {} // Keep for backwards compatibility with code that may have wrapped value binding
};
ko.expressionRewriting.twoWayBindings['value'] = true;
ko.bindingHandlers['visible'] = {
    'update': function (element, valueAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor());
        var isCurrentlyVisible = !(element.style.display == "none");
        if (value && !isCurrentlyVisible)
            element.style.display = "";
        else if ((!value) && isCurrentlyVisible)
            element.style.display = "none";
    }
};
// 'click' is just a shorthand for the usual full-length event:{click:handler}
makeEventHandlerShortcut('click');
// If you want to make a custom template engine,
//
// [1] Inherit from this class (like ko.nativeTemplateEngine does)
// [2] Override 'renderTemplateSource', supplying a function with this signature:
//
//        function (templateSource, bindingContext, options) {
//            // - templateSource.text() is the text of the template you should render
//            // - bindingContext.$data is the data you should pass into the template
//            //   - you might also want to make bindingContext.$parent, bindingContext.$parents,
//            //     and bindingContext.$root available in the template too
//            // - options gives you access to any other properties set on "data-bind: { template: options }"
//            // - templateDocument is the document object of the template
//            //
//            // Return value: an array of DOM nodes
//        }
//
// [3] Override 'createJavaScriptEvaluatorBlock', supplying a function with this signature:
//
//        function (script) {
//            // Return value: Whatever syntax means "Evaluate the JavaScript statement 'script' and output the result"
//            //               For example, the jquery.tmpl template engine converts 'someScript' to '${ someScript }'
//        }
//
//     This is only necessary if you want to allow data-bind attributes to reference arbitrary template variables.
//     If you don't want to allow that, you can set the property 'allowTemplateRewriting' to false (like ko.nativeTemplateEngine does)
//     and then you don't need to override 'createJavaScriptEvaluatorBlock'.

ko.templateEngine = function () { };

ko.templateEngine.prototype['renderTemplateSource'] = function (templateSource, bindingContext, options, templateDocument) {
    throw new Error("Override renderTemplateSource");
};

ko.templateEngine.prototype['createJavaScriptEvaluatorBlock'] = function (script) {
    throw new Error("Override createJavaScriptEvaluatorBlock");
};

ko.templateEngine.prototype['makeTemplateSource'] = function(template, templateDocument) {
    // Named template
    if (typeof template == "string") {
        templateDocument = templateDocument || document;
        var elem = templateDocument.getElementById(template);
        if (!elem)
            throw new Error("Cannot find template with ID " + template);
        return new ko.templateSources.domElement(elem);
    } else if ((template.nodeType == 1) || (template.nodeType == 8)) {
        // Anonymous template
        return new ko.templateSources.anonymousTemplate(template);
    } else
        throw new Error("Unknown template type: " + template);
};

ko.templateEngine.prototype['renderTemplate'] = function (template, bindingContext, options, templateDocument) {
    var templateSource = this['makeTemplateSource'](template, templateDocument);
    return this['renderTemplateSource'](templateSource, bindingContext, options, templateDocument);
};

ko.templateEngine.prototype['isTemplateRewritten'] = function (template, templateDocument) {
    // Skip rewriting if requested
    if (this['allowTemplateRewriting'] === false)
        return true;
    return this['makeTemplateSource'](template, templateDocument)['data']("isRewritten");
};

ko.templateEngine.prototype['rewriteTemplate'] = function (template, rewriterCallback, templateDocument) {
    var templateSource = this['makeTemplateSource'](template, templateDocument);
    var rewritten = rewriterCallback(templateSource['text']());
    templateSource['text'](rewritten);
    templateSource['data']("isRewritten", true);
};

ko.exportSymbol('templateEngine', ko.templateEngine);

ko.templateRewriting = (function () {
    var memoizeDataBindingAttributeSyntaxRegex = /(<([a-z]+\d*)(?:\s+(?!data-bind\s*=\s*)[a-z0-9\-]+(?:=(?:\"[^\"]*\"|\'[^\']*\'|[^>]*))?)*\s+)data-bind\s*=\s*(["'])([\s\S]*?)\3/gi;
    var memoizeVirtualContainerBindingSyntaxRegex = /<!--\s*ko\b\s*([\s\S]*?)\s*-->/g;

    function validateDataBindValuesForRewriting(keyValueArray) {
        var allValidators = ko.expressionRewriting.bindingRewriteValidators;
        for (var i = 0; i < keyValueArray.length; i++) {
            var key = keyValueArray[i]['key'];
            if (allValidators.hasOwnProperty(key)) {
                var validator = allValidators[key];

                if (typeof validator === "function") {
                    var possibleErrorMessage = validator(keyValueArray[i]['value']);
                    if (possibleErrorMessage)
                        throw new Error(possibleErrorMessage);
                } else if (!validator) {
                    throw new Error("This template engine does not support the '" + key + "' binding within its templates");
                }
            }
        }
    }

    function constructMemoizedTagReplacement(dataBindAttributeValue, tagToRetain, nodeName, templateEngine) {
        var dataBindKeyValueArray = ko.expressionRewriting.parseObjectLiteral(dataBindAttributeValue);
        validateDataBindValuesForRewriting(dataBindKeyValueArray);
        var rewrittenDataBindAttributeValue = ko.expressionRewriting.preProcessBindings(dataBindKeyValueArray, {'valueAccessors':true});

        // For no obvious reason, Opera fails to evaluate rewrittenDataBindAttributeValue unless it's wrapped in an additional
        // anonymous function, even though Opera's built-in debugger can evaluate it anyway. No other browser requires this
        // extra indirection.
        var applyBindingsToNextSiblingScript =
            "ko.__tr_ambtns(function($context,$element){return(function(){return{ " + rewrittenDataBindAttributeValue + " } })()},'" + nodeName.toLowerCase() + "')";
        return templateEngine['createJavaScriptEvaluatorBlock'](applyBindingsToNextSiblingScript) + tagToRetain;
    }

    return {
        ensureTemplateIsRewritten: function (template, templateEngine, templateDocument) {
            if (!templateEngine['isTemplateRewritten'](template, templateDocument))
                templateEngine['rewriteTemplate'](template, function (htmlString) {
                    return ko.templateRewriting.memoizeBindingAttributeSyntax(htmlString, templateEngine);
                }, templateDocument);
        },

        memoizeBindingAttributeSyntax: function (htmlString, templateEngine) {
            return htmlString.replace(memoizeDataBindingAttributeSyntaxRegex, function () {
                return constructMemoizedTagReplacement(/* dataBindAttributeValue: */ arguments[4], /* tagToRetain: */ arguments[1], /* nodeName: */ arguments[2], templateEngine);
            }).replace(memoizeVirtualContainerBindingSyntaxRegex, function() {
                return constructMemoizedTagReplacement(/* dataBindAttributeValue: */ arguments[1], /* tagToRetain: */ "<!-- ko -->", /* nodeName: */ "#comment", templateEngine);
            });
        },

        applyMemoizedBindingsToNextSibling: function (bindings, nodeName) {
            return ko.memoization.memoize(function (domNode, bindingContext) {
                var nodeToBind = domNode.nextSibling;
                if (nodeToBind && nodeToBind.nodeName.toLowerCase() === nodeName) {
                    ko.applyBindingAccessorsToNode(nodeToBind, bindings, bindingContext);
                }
            });
        }
    }
})();


// Exported only because it has to be referenced by string lookup from within rewritten template
ko.exportSymbol('__tr_ambtns', ko.templateRewriting.applyMemoizedBindingsToNextSibling);
(function() {
    // A template source represents a read/write way of accessing a template. This is to eliminate the need for template loading/saving
    // logic to be duplicated in every template engine (and means they can all work with anonymous templates, etc.)
    //
    // Two are provided by default:
    //  1. ko.templateSources.domElement       - reads/writes the text content of an arbitrary DOM element
    //  2. ko.templateSources.anonymousElement - uses ko.utils.domData to read/write text *associated* with the DOM element, but
    //                                           without reading/writing the actual element text content, since it will be overwritten
    //                                           with the rendered template output.
    // You can implement your own template source if you want to fetch/store templates somewhere other than in DOM elements.
    // Template sources need to have the following functions:
    //   text() 			- returns the template text from your storage location
    //   text(value)		- writes the supplied template text to your storage location
    //   data(key)			- reads values stored using data(key, value) - see below
    //   data(key, value)	- associates "value" with this template and the key "key". Is used to store information like "isRewritten".
    //
    // Optionally, template sources can also have the following functions:
    //   nodes()            - returns a DOM element containing the nodes of this template, where available
    //   nodes(value)       - writes the given DOM element to your storage location
    // If a DOM element is available for a given template source, template engines are encouraged to use it in preference over text()
    // for improved speed. However, all templateSources must supply text() even if they don't supply nodes().
    //
    // Once you've implemented a templateSource, make your template engine use it by subclassing whatever template engine you were
    // using and overriding "makeTemplateSource" to return an instance of your custom template source.

    ko.templateSources = {};

    // ---- ko.templateSources.domElement -----

    // template types
    var templateScript = 1,
        templateTextArea = 2,
        templateTemplate = 3,
        templateElement = 4;

    ko.templateSources.domElement = function(element) {
        this.domElement = element;

        if (element) {
            var tagNameLower = ko.utils.tagNameLower(element);
            this.templateType =
                tagNameLower === "script" ? templateScript :
                tagNameLower === "textarea" ? templateTextArea :
                    // For browsers with proper <template> element support, where the .content property gives a document fragment
                tagNameLower == "template" && element.content && element.content.nodeType === 11 ? templateTemplate :
                templateElement;
        }
    }

    ko.templateSources.domElement.prototype['text'] = function(/* valueToWrite */) {
        var elemContentsProperty = this.templateType === templateScript ? "text"
                                 : this.templateType === templateTextArea ? "value"
                                 : "innerHTML";

        if (arguments.length == 0) {
            return this.domElement[elemContentsProperty];
        } else {
            var valueToWrite = arguments[0];
            if (elemContentsProperty === "innerHTML")
                ko.utils.setHtml(this.domElement, valueToWrite);
            else
                this.domElement[elemContentsProperty] = valueToWrite;
        }
    };

    var dataDomDataPrefix = ko.utils.domData.nextKey() + "_";
    ko.templateSources.domElement.prototype['data'] = function(key /*, valueToWrite */) {
        if (arguments.length === 1) {
            return ko.utils.domData.get(this.domElement, dataDomDataPrefix + key);
        } else {
            ko.utils.domData.set(this.domElement, dataDomDataPrefix + key, arguments[1]);
        }
    };

    var templatesDomDataKey = ko.utils.domData.nextKey();
    function getTemplateDomData(element) {
        return ko.utils.domData.get(element, templatesDomDataKey) || {};
    }
    function setTemplateDomData(element, data) {
        ko.utils.domData.set(element, templatesDomDataKey, data);
    }

    ko.templateSources.domElement.prototype['nodes'] = function(/* valueToWrite */) {
        var element = this.domElement;
        if (arguments.length == 0) {
            var templateData = getTemplateDomData(element),
                containerData = templateData.containerData;
            return containerData || (
                this.templateType === templateTemplate ? element.content :
                this.templateType === templateElement ? element :
                undefined);
        } else {
            var valueToWrite = arguments[0];
            setTemplateDomData(element, {containerData: valueToWrite});
        }
    };

    // ---- ko.templateSources.anonymousTemplate -----
    // Anonymous templates are normally saved/retrieved as DOM nodes through "nodes".
    // For compatibility, you can also read "text"; it will be serialized from the nodes on demand.
    // Writing to "text" is still supported, but then the template data will not be available as DOM nodes.

    ko.templateSources.anonymousTemplate = function(element) {
        this.domElement = element;
    }
    ko.templateSources.anonymousTemplate.prototype = new ko.templateSources.domElement();
    ko.templateSources.anonymousTemplate.prototype.constructor = ko.templateSources.anonymousTemplate;
    ko.templateSources.anonymousTemplate.prototype['text'] = function(/* valueToWrite */) {
        if (arguments.length == 0) {
            var templateData = getTemplateDomData(this.domElement);
            if (templateData.textData === undefined && templateData.containerData)
                templateData.textData = templateData.containerData.innerHTML;
            return templateData.textData;
        } else {
            var valueToWrite = arguments[0];
            setTemplateDomData(this.domElement, {textData: valueToWrite});
        }
    };

    ko.exportSymbol('templateSources', ko.templateSources);
    ko.exportSymbol('templateSources.domElement', ko.templateSources.domElement);
    ko.exportSymbol('templateSources.anonymousTemplate', ko.templateSources.anonymousTemplate);
})();
(function () {
    var _templateEngine;
    ko.setTemplateEngine = function (templateEngine) {
        if ((templateEngine != undefined) && !(templateEngine instanceof ko.templateEngine))
            throw new Error("templateEngine must inherit from ko.templateEngine");
        _templateEngine = templateEngine;
    }

    function invokeForEachNodeInContinuousRange(firstNode, lastNode, action) {
        var node, nextInQueue = firstNode, firstOutOfRangeNode = ko.virtualElements.nextSibling(lastNode);
        while (nextInQueue && ((node = nextInQueue) !== firstOutOfRangeNode)) {
            nextInQueue = ko.virtualElements.nextSibling(node);
            action(node, nextInQueue);
        }
    }

    function activateBindingsOnContinuousNodeArray(continuousNodeArray, bindingContext) {
        // To be used on any nodes that have been rendered by a template and have been inserted into some parent element
        // Walks through continuousNodeArray (which *must* be continuous, i.e., an uninterrupted sequence of sibling nodes, because
        // the algorithm for walking them relies on this), and for each top-level item in the virtual-element sense,
        // (1) Does a regular "applyBindings" to associate bindingContext with this node and to activate any non-memoized bindings
        // (2) Unmemoizes any memos in the DOM subtree (e.g., to activate bindings that had been memoized during template rewriting)

        if (continuousNodeArray.length) {
            var firstNode = continuousNodeArray[0],
                lastNode = continuousNodeArray[continuousNodeArray.length - 1],
                parentNode = firstNode.parentNode,
                provider = ko.bindingProvider['instance'],
                preprocessNode = provider['preprocessNode'];

            if (preprocessNode) {
                invokeForEachNodeInContinuousRange(firstNode, lastNode, function(node, nextNodeInRange) {
                    var nodePreviousSibling = node.previousSibling;
                    var newNodes = preprocessNode.call(provider, node);
                    if (newNodes) {
                        if (node === firstNode)
                            firstNode = newNodes[0] || nextNodeInRange;
                        if (node === lastNode)
                            lastNode = newNodes[newNodes.length - 1] || nodePreviousSibling;
                    }
                });

                // Because preprocessNode can change the nodes, including the first and last nodes, update continuousNodeArray to match.
                // We need the full set, including inner nodes, because the unmemoize step might remove the first node (and so the real
                // first node needs to be in the array).
                continuousNodeArray.length = 0;
                if (!firstNode) { // preprocessNode might have removed all the nodes, in which case there's nothing left to do
                    return;
                }
                if (firstNode === lastNode) {
                    continuousNodeArray.push(firstNode);
                } else {
                    continuousNodeArray.push(firstNode, lastNode);
                    ko.utils.fixUpContinuousNodeArray(continuousNodeArray, parentNode);
                }
            }

            // Need to applyBindings *before* unmemoziation, because unmemoization might introduce extra nodes (that we don't want to re-bind)
            // whereas a regular applyBindings won't introduce new memoized nodes
            invokeForEachNodeInContinuousRange(firstNode, lastNode, function(node) {
                if (node.nodeType === 1 || node.nodeType === 8)
                    ko.applyBindings(bindingContext, node);
            });
            invokeForEachNodeInContinuousRange(firstNode, lastNode, function(node) {
                if (node.nodeType === 1 || node.nodeType === 8)
                    ko.memoization.unmemoizeDomNodeAndDescendants(node, [bindingContext]);
            });

            // Make sure any changes done by applyBindings or unmemoize are reflected in the array
            ko.utils.fixUpContinuousNodeArray(continuousNodeArray, parentNode);
        }
    }

    function getFirstNodeFromPossibleArray(nodeOrNodeArray) {
        return nodeOrNodeArray.nodeType ? nodeOrNodeArray
                                        : nodeOrNodeArray.length > 0 ? nodeOrNodeArray[0]
                                        : null;
    }

    function executeTemplate(targetNodeOrNodeArray, renderMode, template, bindingContext, options) {
        options = options || {};
        var firstTargetNode = targetNodeOrNodeArray && getFirstNodeFromPossibleArray(targetNodeOrNodeArray);
        var templateDocument = (firstTargetNode || template || {}).ownerDocument;
        var templateEngineToUse = (options['templateEngine'] || _templateEngine);
        ko.templateRewriting.ensureTemplateIsRewritten(template, templateEngineToUse, templateDocument);
        var renderedNodesArray = templateEngineToUse['renderTemplate'](template, bindingContext, options, templateDocument);

        // Loosely check result is an array of DOM nodes
        if ((typeof renderedNodesArray.length != "number") || (renderedNodesArray.length > 0 && typeof renderedNodesArray[0].nodeType != "number"))
            throw new Error("Template engine must return an array of DOM nodes");

        var haveAddedNodesToParent = false;
        switch (renderMode) {
            case "replaceChildren":
                ko.virtualElements.setDomNodeChildren(targetNodeOrNodeArray, renderedNodesArray);
                haveAddedNodesToParent = true;
                break;
            case "replaceNode":
                ko.utils.replaceDomNodes(targetNodeOrNodeArray, renderedNodesArray);
                haveAddedNodesToParent = true;
                break;
            case "ignoreTargetNode": break;
            default:
                throw new Error("Unknown renderMode: " + renderMode);
        }

        if (haveAddedNodesToParent) {
            activateBindingsOnContinuousNodeArray(renderedNodesArray, bindingContext);
            if (options['afterRender'])
                ko.dependencyDetection.ignore(options['afterRender'], null, [renderedNodesArray, bindingContext['$data']]);
        }

        return renderedNodesArray;
    }

    function resolveTemplateName(template, data, context) {
        // The template can be specified as:
        if (ko.isObservable(template)) {
            // 1. An observable, with string value
            return template();
        } else if (typeof template === 'function') {
            // 2. A function of (data, context) returning a string
            return template(data, context);
        } else {
            // 3. A string
            return template;
        }
    }

    ko.renderTemplate = function (template, dataOrBindingContext, options, targetNodeOrNodeArray, renderMode) {
        options = options || {};
        if ((options['templateEngine'] || _templateEngine) == undefined)
            throw new Error("Set a template engine before calling renderTemplate");
        renderMode = renderMode || "replaceChildren";

        if (targetNodeOrNodeArray) {
            var firstTargetNode = getFirstNodeFromPossibleArray(targetNodeOrNodeArray);

            var whenToDispose = function () { return (!firstTargetNode) || !ko.utils.domNodeIsAttachedToDocument(firstTargetNode); }; // Passive disposal (on next evaluation)
            var activelyDisposeWhenNodeIsRemoved = (firstTargetNode && renderMode == "replaceNode") ? firstTargetNode.parentNode : firstTargetNode;

            return ko.dependentObservable( // So the DOM is automatically updated when any dependency changes
                function () {
                    // Ensure we've got a proper binding context to work with
                    var bindingContext = (dataOrBindingContext && (dataOrBindingContext instanceof ko.bindingContext))
                        ? dataOrBindingContext
                        : new ko.bindingContext(ko.utils.unwrapObservable(dataOrBindingContext));

                    var templateName = resolveTemplateName(template, bindingContext['$data'], bindingContext),
                        renderedNodesArray = executeTemplate(targetNodeOrNodeArray, renderMode, templateName, bindingContext, options);

                    if (renderMode == "replaceNode") {
                        targetNodeOrNodeArray = renderedNodesArray;
                        firstTargetNode = getFirstNodeFromPossibleArray(targetNodeOrNodeArray);
                    }
                },
                null,
                { disposeWhen: whenToDispose, disposeWhenNodeIsRemoved: activelyDisposeWhenNodeIsRemoved }
            );
        } else {
            // We don't yet have a DOM node to evaluate, so use a memo and render the template later when there is a DOM node
            return ko.memoization.memoize(function (domNode) {
                ko.renderTemplate(template, dataOrBindingContext, options, domNode, "replaceNode");
            });
        }
    };

    ko.renderTemplateForEach = function (template, arrayOrObservableArray, options, targetNode, parentBindingContext) {
        // Since setDomNodeChildrenFromArrayMapping always calls executeTemplateForArrayItem and then
        // activateBindingsCallback for added items, we can store the binding context in the former to use in the latter.
        var arrayItemContext;

        // This will be called by setDomNodeChildrenFromArrayMapping to get the nodes to add to targetNode
        var executeTemplateForArrayItem = function (arrayValue, index) {
            // Support selecting template as a function of the data being rendered
            arrayItemContext = parentBindingContext['createChildContext'](arrayValue, options['as'], function(context) {
                context['$index'] = index;
            });

            var templateName = resolveTemplateName(template, arrayValue, arrayItemContext);
            return executeTemplate(null, "ignoreTargetNode", templateName, arrayItemContext, options);
        }

        // This will be called whenever setDomNodeChildrenFromArrayMapping has added nodes to targetNode
        var activateBindingsCallback = function(arrayValue, addedNodesArray, index) {
            activateBindingsOnContinuousNodeArray(addedNodesArray, arrayItemContext);
            if (options['afterRender'])
                options['afterRender'](addedNodesArray, arrayValue);

            // release the "cache" variable, so that it can be collected by
            // the GC when its value isn't used from within the bindings anymore.
            arrayItemContext = null;
        };

        return ko.dependentObservable(function () {
            var unwrappedArray = ko.utils.unwrapObservable(arrayOrObservableArray) || [];
            if (typeof unwrappedArray.length == "undefined") // Coerce single value into array
                unwrappedArray = [unwrappedArray];

            // Filter out any entries marked as destroyed
            var filteredArray = ko.utils.arrayFilter(unwrappedArray, function(item) {
                return options['includeDestroyed'] || item === undefined || item === null || !ko.utils.unwrapObservable(item['_destroy']);
            });

            // Call setDomNodeChildrenFromArrayMapping, ignoring any observables unwrapped within (most likely from a callback function).
            // If the array items are observables, though, they will be unwrapped in executeTemplateForArrayItem and managed within setDomNodeChildrenFromArrayMapping.
            ko.dependencyDetection.ignore(ko.utils.setDomNodeChildrenFromArrayMapping, null, [targetNode, filteredArray, executeTemplateForArrayItem, options, activateBindingsCallback]);

        }, null, { disposeWhenNodeIsRemoved: targetNode });
    };

    var templateComputedDomDataKey = ko.utils.domData.nextKey();
    function disposeOldComputedAndStoreNewOne(element, newComputed) {
        var oldComputed = ko.utils.domData.get(element, templateComputedDomDataKey);
        if (oldComputed && (typeof(oldComputed.dispose) == 'function'))
            oldComputed.dispose();
        ko.utils.domData.set(element, templateComputedDomDataKey, (newComputed && newComputed.isActive()) ? newComputed : undefined);
    }

    ko.bindingHandlers['template'] = {
        'init': function(element, valueAccessor) {
            // Support anonymous templates
            var bindingValue = ko.utils.unwrapObservable(valueAccessor());
            if (typeof bindingValue == "string" || bindingValue['name']) {
                // It's a named template - clear the element
                ko.virtualElements.emptyNode(element);
            } else if ('nodes' in bindingValue) {
                // We've been given an array of DOM nodes. Save them as the template source.
                // There is no known use case for the node array being an observable array (if the output
                // varies, put that behavior *into* your template - that's what templates are for), and
                // the implementation would be a mess, so assert that it's not observable.
                var nodes = bindingValue['nodes'] || [];
                if (ko.isObservable(nodes)) {
                    throw new Error('The "nodes" option must be a plain, non-observable array.');
                }
                var container = ko.utils.moveCleanedNodesToContainerElement(nodes); // This also removes the nodes from their current parent
                new ko.templateSources.anonymousTemplate(element)['nodes'](container);
            } else {
                // It's an anonymous template - store the element contents, then clear the element
                var templateNodes = ko.virtualElements.childNodes(element),
                    container = ko.utils.moveCleanedNodesToContainerElement(templateNodes); // This also removes the nodes from their current parent
                new ko.templateSources.anonymousTemplate(element)['nodes'](container);
            }
            return { 'controlsDescendantBindings': true };
        },
        'update': function (element, valueAccessor, allBindings, viewModel, bindingContext) {
            var value = valueAccessor(),
                dataValue,
                options = ko.utils.unwrapObservable(value),
                shouldDisplay = true,
                templateComputed = null,
                templateName;

            if (typeof options == "string") {
                templateName = value;
                options = {};
            } else {
                templateName = options['name'];

                // Support "if"/"ifnot" conditions
                if ('if' in options)
                    shouldDisplay = ko.utils.unwrapObservable(options['if']);
                if (shouldDisplay && 'ifnot' in options)
                    shouldDisplay = !ko.utils.unwrapObservable(options['ifnot']);

                dataValue = ko.utils.unwrapObservable(options['data']);
            }

            if ('foreach' in options) {
                // Render once for each data point (treating data set as empty if shouldDisplay==false)
                var dataArray = (shouldDisplay && options['foreach']) || [];
                templateComputed = ko.renderTemplateForEach(templateName || element, dataArray, options, element, bindingContext);
            } else if (!shouldDisplay) {
                ko.virtualElements.emptyNode(element);
            } else {
                // Render once for this single data point (or use the viewModel if no data was provided)
                var innerBindingContext = ('data' in options) ?
                    bindingContext['createChildContext'](dataValue, options['as']) :  // Given an explitit 'data' value, we create a child binding context for it
                    bindingContext;                                                        // Given no explicit 'data' value, we retain the same binding context
                templateComputed = ko.renderTemplate(templateName || element, innerBindingContext, options, element);
            }

            // It only makes sense to have a single template computed per element (otherwise which one should have its output displayed?)
            disposeOldComputedAndStoreNewOne(element, templateComputed);
        }
    };

    // Anonymous templates can't be rewritten. Give a nice error message if you try to do it.
    ko.expressionRewriting.bindingRewriteValidators['template'] = function(bindingValue) {
        var parsedBindingValue = ko.expressionRewriting.parseObjectLiteral(bindingValue);

        if ((parsedBindingValue.length == 1) && parsedBindingValue[0]['unknown'])
            return null; // It looks like a string literal, not an object literal, so treat it as a named template (which is allowed for rewriting)

        if (ko.expressionRewriting.keyValueArrayContainsKey(parsedBindingValue, "name"))
            return null; // Named templates can be rewritten, so return "no error"
        return "This template engine does not support anonymous templates nested within its templates";
    };

    ko.virtualElements.allowedBindings['template'] = true;
})();

ko.exportSymbol('setTemplateEngine', ko.setTemplateEngine);
ko.exportSymbol('renderTemplate', ko.renderTemplate);
// Go through the items that have been added and deleted and try to find matches between them.
ko.utils.findMovesInArrayComparison = function (left, right, limitFailedCompares) {
    if (left.length && right.length) {
        var failedCompares, l, r, leftItem, rightItem;
        for (failedCompares = l = 0; (!limitFailedCompares || failedCompares < limitFailedCompares) && (leftItem = left[l]); ++l) {
            for (r = 0; rightItem = right[r]; ++r) {
                if (leftItem['value'] === rightItem['value']) {
                    leftItem['moved'] = rightItem['index'];
                    rightItem['moved'] = leftItem['index'];
                    right.splice(r, 1);         // This item is marked as moved; so remove it from right list
                    failedCompares = r = 0;     // Reset failed compares count because we're checking for consecutive failures
                    break;
                }
            }
            failedCompares += r;
        }
    }
};

ko.utils.compareArrays = (function () {
    var statusNotInOld = 'added', statusNotInNew = 'deleted';

    // Simple calculation based on Levenshtein distance.
    function compareArrays(oldArray, newArray, options) {
        // For backward compatibility, if the third arg is actually a bool, interpret
        // it as the old parameter 'dontLimitMoves'. Newer code should use { dontLimitMoves: true }.
        options = (typeof options === 'boolean') ? { 'dontLimitMoves': options } : (options || {});
        oldArray = oldArray || [];
        newArray = newArray || [];

        if (oldArray.length < newArray.length)
            return compareSmallArrayToBigArray(oldArray, newArray, statusNotInOld, statusNotInNew, options);
        else
            return compareSmallArrayToBigArray(newArray, oldArray, statusNotInNew, statusNotInOld, options);
    }

    function compareSmallArrayToBigArray(smlArray, bigArray, statusNotInSml, statusNotInBig, options) {
        var myMin = Math.min,
            myMax = Math.max,
            editDistanceMatrix = [],
            smlIndex, smlIndexMax = smlArray.length,
            bigIndex, bigIndexMax = bigArray.length,
            compareRange = (bigIndexMax - smlIndexMax) || 1,
            maxDistance = smlIndexMax + bigIndexMax + 1,
            thisRow, lastRow,
            bigIndexMaxForRow, bigIndexMinForRow;

        for (smlIndex = 0; smlIndex <= smlIndexMax; smlIndex++) {
            lastRow = thisRow;
            editDistanceMatrix.push(thisRow = []);
            bigIndexMaxForRow = myMin(bigIndexMax, smlIndex + compareRange);
            bigIndexMinForRow = myMax(0, smlIndex - 1);
            for (bigIndex = bigIndexMinForRow; bigIndex <= bigIndexMaxForRow; bigIndex++) {
                if (!bigIndex)
                    thisRow[bigIndex] = smlIndex + 1;
                else if (!smlIndex)  // Top row - transform empty array into new array via additions
                    thisRow[bigIndex] = bigIndex + 1;
                else if (smlArray[smlIndex - 1] === bigArray[bigIndex - 1])
                    thisRow[bigIndex] = lastRow[bigIndex - 1];                  // copy value (no edit)
                else {
                    var northDistance = lastRow[bigIndex] || maxDistance;       // not in big (deletion)
                    var westDistance = thisRow[bigIndex - 1] || maxDistance;    // not in small (addition)
                    thisRow[bigIndex] = myMin(northDistance, westDistance) + 1;
                }
            }
        }

        var editScript = [], meMinusOne, notInSml = [], notInBig = [];
        for (smlIndex = smlIndexMax, bigIndex = bigIndexMax; smlIndex || bigIndex;) {
            meMinusOne = editDistanceMatrix[smlIndex][bigIndex] - 1;
            if (bigIndex && meMinusOne === editDistanceMatrix[smlIndex][bigIndex-1]) {
                notInSml.push(editScript[editScript.length] = {     // added
                    'status': statusNotInSml,
                    'value': bigArray[--bigIndex],
                    'index': bigIndex });
            } else if (smlIndex && meMinusOne === editDistanceMatrix[smlIndex - 1][bigIndex]) {
                notInBig.push(editScript[editScript.length] = {     // deleted
                    'status': statusNotInBig,
                    'value': smlArray[--smlIndex],
                    'index': smlIndex });
            } else {
                --bigIndex;
                --smlIndex;
                if (!options['sparse']) {
                    editScript.push({
                        'status': "retained",
                        'value': bigArray[bigIndex] });
                }
            }
        }

        // Set a limit on the number of consecutive non-matching comparisons; having it a multiple of
        // smlIndexMax keeps the time complexity of this algorithm linear.
        ko.utils.findMovesInArrayComparison(notInBig, notInSml, !options['dontLimitMoves'] && smlIndexMax * 10);

        return editScript.reverse();
    }

    return compareArrays;
})();

ko.exportSymbol('utils.compareArrays', ko.utils.compareArrays);
(function () {
    // Objective:
    // * Given an input array, a container DOM node, and a function from array elements to arrays of DOM nodes,
    //   map the array elements to arrays of DOM nodes, concatenate together all these arrays, and use them to populate the container DOM node
    // * Next time we're given the same combination of things (with the array possibly having mutated), update the container DOM node
    //   so that its children is again the concatenation of the mappings of the array elements, but don't re-map any array elements that we
    //   previously mapped - retain those nodes, and just insert/delete other ones

    // "callbackAfterAddingNodes" will be invoked after any "mapping"-generated nodes are inserted into the container node
    // You can use this, for example, to activate bindings on those nodes.

    function mapNodeAndRefreshWhenChanged(containerNode, mapping, valueToMap, callbackAfterAddingNodes, index) {
        // Map this array value inside a dependentObservable so we re-map when any dependency changes
        var mappedNodes = [];
        var dependentObservable = ko.dependentObservable(function() {
            var newMappedNodes = mapping(valueToMap, index, ko.utils.fixUpContinuousNodeArray(mappedNodes, containerNode)) || [];

            // On subsequent evaluations, just replace the previously-inserted DOM nodes
            if (mappedNodes.length > 0) {
                ko.utils.replaceDomNodes(mappedNodes, newMappedNodes);
                if (callbackAfterAddingNodes)
                    ko.dependencyDetection.ignore(callbackAfterAddingNodes, null, [valueToMap, newMappedNodes, index]);
            }

            // Replace the contents of the mappedNodes array, thereby updating the record
            // of which nodes would be deleted if valueToMap was itself later removed
            mappedNodes.length = 0;
            ko.utils.arrayPushAll(mappedNodes, newMappedNodes);
        }, null, { disposeWhenNodeIsRemoved: containerNode, disposeWhen: function() { return !ko.utils.anyDomNodeIsAttachedToDocument(mappedNodes); } });
        return { mappedNodes : mappedNodes, dependentObservable : (dependentObservable.isActive() ? dependentObservable : undefined) };
    }

    var lastMappingResultDomDataKey = ko.utils.domData.nextKey(),
        deletedItemDummyValue = ko.utils.domData.nextKey();

    ko.utils.setDomNodeChildrenFromArrayMapping = function (domNode, array, mapping, options, callbackAfterAddingNodes) {
        // Compare the provided array against the previous one
        array = array || [];
        options = options || {};
        var isFirstExecution = ko.utils.domData.get(domNode, lastMappingResultDomDataKey) === undefined;
        var lastMappingResult = ko.utils.domData.get(domNode, lastMappingResultDomDataKey) || [];
        var lastArray = ko.utils.arrayMap(lastMappingResult, function (x) { return x.arrayEntry; });
        var editScript = ko.utils.compareArrays(lastArray, array, options['dontLimitMoves']);

        // Build the new mapping result
        var newMappingResult = [];
        var lastMappingResultIndex = 0;
        var newMappingResultIndex = 0;

        var nodesToDelete = [];
        var itemsToProcess = [];
        var itemsForBeforeRemoveCallbacks = [];
        var itemsForMoveCallbacks = [];
        var itemsForAfterAddCallbacks = [];
        var mapData;

        function itemMovedOrRetained(editScriptIndex, oldPosition) {
            mapData = lastMappingResult[oldPosition];
            if (newMappingResultIndex !== oldPosition)
                itemsForMoveCallbacks[editScriptIndex] = mapData;
            // Since updating the index might change the nodes, do so before calling fixUpContinuousNodeArray
            mapData.indexObservable(newMappingResultIndex++);
            ko.utils.fixUpContinuousNodeArray(mapData.mappedNodes, domNode);
            newMappingResult.push(mapData);
            itemsToProcess.push(mapData);
        }

        function callCallback(callback, items) {
            if (callback) {
                for (var i = 0, n = items.length; i < n; i++) {
                    if (items[i]) {
                        ko.utils.arrayForEach(items[i].mappedNodes, function(node) {
                            callback(node, i, items[i].arrayEntry);
                        });
                    }
                }
            }
        }

        for (var i = 0, editScriptItem, movedIndex; editScriptItem = editScript[i]; i++) {
            movedIndex = editScriptItem['moved'];
            switch (editScriptItem['status']) {
                case "deleted":
                    if (movedIndex === undefined) {
                        mapData = lastMappingResult[lastMappingResultIndex];

                        // Stop tracking changes to the mapping for these nodes
                        if (mapData.dependentObservable) {
                            mapData.dependentObservable.dispose();
                            mapData.dependentObservable = undefined;
                        }

                        // Queue these nodes for later removal
                        if (ko.utils.fixUpContinuousNodeArray(mapData.mappedNodes, domNode).length) {
                            if (options['beforeRemove']) {
                                newMappingResult.push(mapData);
                                itemsToProcess.push(mapData);
                                if (mapData.arrayEntry === deletedItemDummyValue) {
                                    mapData = null;
                                } else {
                                    itemsForBeforeRemoveCallbacks[i] = mapData;
                                }
                            }
                            if (mapData) {
                                nodesToDelete.push.apply(nodesToDelete, mapData.mappedNodes);
                            }
                        }
                    }
                    lastMappingResultIndex++;
                    break;

                case "retained":
                    itemMovedOrRetained(i, lastMappingResultIndex++);
                    break;

                case "added":
                    if (movedIndex !== undefined) {
                        itemMovedOrRetained(i, movedIndex);
                    } else {
                        mapData = { arrayEntry: editScriptItem['value'], indexObservable: ko.observable(newMappingResultIndex++) };
                        newMappingResult.push(mapData);
                        itemsToProcess.push(mapData);
                        if (!isFirstExecution)
                            itemsForAfterAddCallbacks[i] = mapData;
                    }
                    break;
            }
        }

        // Store a copy of the array items we just considered so we can difference it next time
        ko.utils.domData.set(domNode, lastMappingResultDomDataKey, newMappingResult);

        // Call beforeMove first before any changes have been made to the DOM
        callCallback(options['beforeMove'], itemsForMoveCallbacks);

        // Next remove nodes for deleted items (or just clean if there's a beforeRemove callback)
        ko.utils.arrayForEach(nodesToDelete, options['beforeRemove'] ? ko.cleanNode : ko.removeNode);

        // Next add/reorder the remaining items (will include deleted items if there's a beforeRemove callback)
        for (var i = 0, nextNode = ko.virtualElements.firstChild(domNode), lastNode, node; mapData = itemsToProcess[i]; i++) {
            // Get nodes for newly added items
            if (!mapData.mappedNodes)
                ko.utils.extend(mapData, mapNodeAndRefreshWhenChanged(domNode, mapping, mapData.arrayEntry, callbackAfterAddingNodes, mapData.indexObservable));

            // Put nodes in the right place if they aren't there already
            for (var j = 0; node = mapData.mappedNodes[j]; nextNode = node.nextSibling, lastNode = node, j++) {
                if (node !== nextNode)
                    ko.virtualElements.insertAfter(domNode, node, lastNode);
            }

            // Run the callbacks for newly added nodes (for example, to apply bindings, etc.)
            if (!mapData.initialized && callbackAfterAddingNodes) {
                callbackAfterAddingNodes(mapData.arrayEntry, mapData.mappedNodes, mapData.indexObservable);
                mapData.initialized = true;
            }
        }

        // If there's a beforeRemove callback, call it after reordering.
        // Note that we assume that the beforeRemove callback will usually be used to remove the nodes using
        // some sort of animation, which is why we first reorder the nodes that will be removed. If the
        // callback instead removes the nodes right away, it would be more efficient to skip reordering them.
        // Perhaps we'll make that change in the future if this scenario becomes more common.
        callCallback(options['beforeRemove'], itemsForBeforeRemoveCallbacks);

        // Replace the stored values of deleted items with a dummy value. This provides two benefits: it marks this item
        // as already "removed" so we won't call beforeRemove for it again, and it ensures that the item won't match up
        // with an actual item in the array and appear as "retained" or "moved".
        for (i = 0; i < itemsForBeforeRemoveCallbacks.length; ++i) {
            if (itemsForBeforeRemoveCallbacks[i]) {
                itemsForBeforeRemoveCallbacks[i].arrayEntry = deletedItemDummyValue;
            }
        }

        // Finally call afterMove and afterAdd callbacks
        callCallback(options['afterMove'], itemsForMoveCallbacks);
        callCallback(options['afterAdd'], itemsForAfterAddCallbacks);
    }
})();

ko.exportSymbol('utils.setDomNodeChildrenFromArrayMapping', ko.utils.setDomNodeChildrenFromArrayMapping);
ko.nativeTemplateEngine = function () {
    this['allowTemplateRewriting'] = false;
}

ko.nativeTemplateEngine.prototype = new ko.templateEngine();
ko.nativeTemplateEngine.prototype.constructor = ko.nativeTemplateEngine;
ko.nativeTemplateEngine.prototype['renderTemplateSource'] = function (templateSource, bindingContext, options, templateDocument) {
    var useNodesIfAvailable = !(ko.utils.ieVersion < 9), // IE<9 cloneNode doesn't work properly
        templateNodesFunc = useNodesIfAvailable ? templateSource['nodes'] : null,
        templateNodes = templateNodesFunc ? templateSource['nodes']() : null;

    if (templateNodes) {
        return ko.utils.makeArray(templateNodes.cloneNode(true).childNodes);
    } else {
        var templateText = templateSource['text']();
        return ko.utils.parseHtmlFragment(templateText, templateDocument);
    }
};

ko.nativeTemplateEngine.instance = new ko.nativeTemplateEngine();
ko.setTemplateEngine(ko.nativeTemplateEngine.instance);

ko.exportSymbol('nativeTemplateEngine', ko.nativeTemplateEngine);
(function() {
    ko.jqueryTmplTemplateEngine = function () {
        // Detect which version of jquery-tmpl you're using. Unfortunately jquery-tmpl
        // doesn't expose a version number, so we have to infer it.
        // Note that as of Knockout 1.3, we only support jQuery.tmpl 1.0.0pre and later,
        // which KO internally refers to as version "2", so older versions are no longer detected.
        var jQueryTmplVersion = this.jQueryTmplVersion = (function() {
            if (!jQueryInstance || !(jQueryInstance['tmpl']))
                return 0;
            // Since it exposes no official version number, we use our own numbering system. To be updated as jquery-tmpl evolves.
            try {
                if (jQueryInstance['tmpl']['tag']['tmpl']['open'].toString().indexOf('__') >= 0) {
                    // Since 1.0.0pre, custom tags should append markup to an array called "__"
                    return 2; // Final version of jquery.tmpl
                }
            } catch(ex) { /* Apparently not the version we were looking for */ }

            return 1; // Any older version that we don't support
        })();

        function ensureHasReferencedJQueryTemplates() {
            if (jQueryTmplVersion < 2)
                throw new Error("Your version of jQuery.tmpl is too old. Please upgrade to jQuery.tmpl 1.0.0pre or later.");
        }

        function executeTemplate(compiledTemplate, data, jQueryTemplateOptions) {
            return jQueryInstance['tmpl'](compiledTemplate, data, jQueryTemplateOptions);
        }

        this['renderTemplateSource'] = function(templateSource, bindingContext, options, templateDocument) {
            templateDocument = templateDocument || document;
            options = options || {};
            ensureHasReferencedJQueryTemplates();

            // Ensure we have stored a precompiled version of this template (don't want to reparse on every render)
            var precompiled = templateSource['data']('precompiled');
            if (!precompiled) {
                var templateText = templateSource['text']() || "";
                // Wrap in "with($whatever.koBindingContext) { ... }"
                templateText = "{{ko_with $item.koBindingContext}}" + templateText + "{{/ko_with}}";

                precompiled = jQueryInstance['template'](null, templateText);
                templateSource['data']('precompiled', precompiled);
            }

            var data = [bindingContext['$data']]; // Prewrap the data in an array to stop jquery.tmpl from trying to unwrap any arrays
            var jQueryTemplateOptions = jQueryInstance['extend']({ 'koBindingContext': bindingContext }, options['templateOptions']);

            var resultNodes = executeTemplate(precompiled, data, jQueryTemplateOptions);
            resultNodes['appendTo'](templateDocument.createElement("div")); // Using "appendTo" forces jQuery/jQuery.tmpl to perform necessary cleanup work

            jQueryInstance['fragments'] = {}; // Clear jQuery's fragment cache to avoid a memory leak after a large number of template renders
            return resultNodes;
        };

        this['createJavaScriptEvaluatorBlock'] = function(script) {
            return "{{ko_code ((function() { return " + script + " })()) }}";
        };

        this['addTemplate'] = function(templateName, templateMarkup) {
            document.write("<script type='text/html' id='" + templateName + "'>" + templateMarkup + "<" + "/script>");
        };

        if (jQueryTmplVersion > 0) {
            jQueryInstance['tmpl']['tag']['ko_code'] = {
                open: "__.push($1 || '');"
            };
            jQueryInstance['tmpl']['tag']['ko_with'] = {
                open: "with($1) {",
                close: "} "
            };
        }
    };

    ko.jqueryTmplTemplateEngine.prototype = new ko.templateEngine();
    ko.jqueryTmplTemplateEngine.prototype.constructor = ko.jqueryTmplTemplateEngine;

    // Use this one by default *only if jquery.tmpl is referenced*
    var jqueryTmplTemplateEngineInstance = new ko.jqueryTmplTemplateEngine();
    if (jqueryTmplTemplateEngineInstance.jQueryTmplVersion > 0)
        ko.setTemplateEngine(jqueryTmplTemplateEngineInstance);

    ko.exportSymbol('jqueryTmplTemplateEngine', ko.jqueryTmplTemplateEngine);
})();
}));
}());
})();

},{}],2:[function(require,module,exports){
/*
 * Copyright 2013 Google, Inc.
 * Copyright 2015 Vivliostyle Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
(function(factory) {
    if (typeof define === "function" && define.amd) {
        // AMD
        define([], factory);
    } else if (typeof module === "object") {
        // Node.js
        var enclosingObject = {};
        module.exports = factory(enclosingObject);
    } else if (typeof exports === "object") {
        // CommonJS
        var enclosingObject = {};
        exports = factory(enclosingObject);
    } else {
        // Attach to the window object
        factory(window);
    }
})(function(enclosingObject) {
    enclosingObject = enclosingObject || {};
    var m,ba=this;function ca(a,b){var c=a.split("."),d=("undefined"!==typeof enclosingObject&&enclosingObject?enclosingObject:window)||ba;c[0]in d||!d.execScript||d.execScript("var "+c[0]);for(var e;c.length&&(e=c.shift());)c.length||void 0===b?d[e]?d=d[e]:d=d[e]={}:d[e]=b}
function t(a,b){function c(){}c.prototype=b.prototype;a.Id=b.prototype;a.prototype=new c;a.prototype.constructor=a;a.Yd=function(a,c,f){for(var g=Array(arguments.length-2),k=2;k<arguments.length;k++)g[k-2]=arguments[k];return b.prototype[c].apply(a,g)}};function da(a){var b=a.match(/^([^#]*)/);return b?b[1]:a}var ea=window.location.href;
function fa(a,b){if(!b||a.match(/^\w{2,}:/))return a.toLowerCase().match("^javascript:")?"#":a;b.match(/^\w{2,}:\/\/[^\/]+$/)&&(b+="/");var c;if(a.match(/^\/\//))return(c=b.match(/^(\w{2,}:)\/\//))?c[1]+a:a;if(a.match(/^\//))return(c=b.match(/^(\w{2,}:\/\/[^\/]+)\//))?c[1]+a:a;a.match(/^\.(\/|$)/)&&(a=a.substr(1));c=b;var d=c.match(/^([^#?]*)/);b=d?d[1]:c;if(a.match(/^\#/))return b+a;c=b.lastIndexOf("/");if(0>c)return a;for(d=b.substr(0,c+1)+a;;){c=d.indexOf("/../");if(0>=c)break;var e=d.lastIndexOf("/",
c-1);if(0>=e)break;d=d.substr(0,e)+d.substr(c+3)}return d.replace(/\/(\.\/)+/g,"/")}function ga(a){a=new RegExp("#(.*&)?"+ha(a)+"=([^#&]*)");return(a=window.location.href.match(a))?a[2]:null}function ia(a,b){var c=new RegExp("#(.*&)?"+ha("f")+"=([^#&]*)"),d=a.match(c);return d?(c=d[2].length,d=d.index+d[0].length-c,a.substr(0,d)+b+a.substr(d+c)):a.match(/#/)?a+"&f="+b:a+"#f="+b}function ja(a){return null==a?a:a.toString()}function ka(){this.b=[null]}
ka.prototype.length=function(){return this.b.length-1};function la(){return ma.replace(/-[a-z]/g,function(a){return a.substr(1).toUpperCase()})}var na="-webkit- -moz- -ms- -o- -epub- ".split(" "),oa;
a:{var pa="transform transform-origin hyphens writing-mode text-orientation box-decoration-break column-count column-width column-rule-color column-rule-style column-rule-width font-kerning text-size-adjust line-break tab-size text-align-last text-justify word-break word-wrap text-decoration-color text-decoration-line text-decoration-skip text-decoration-style text-emphasis-color text-emphasis-position text-emphasis-style text-underline-position backface-visibility text-overflow text-combine text-combine-horizontal text-combine-upright text-orientation touch-action".split(" "),qa=
{},ra=document.createElement("span"),sa=ra.style,ta=null;try{if(ra.style.setProperty("-ms-transform-origin","0% 0%"),"0% 0%"==ra.style.getPropertyValue("-ms-transform-origin")){for(var ua=0;ua<pa.length;ua++)qa[pa[ua]]="-ms-"+pa[ua];oa=qa;break a}}catch(va){}for(ua=0;ua<pa.length;ua++){var wa=pa[ua],ma=null,xa=null;ta&&(ma=ta+wa,xa=la());if(!xa||null==sa[xa])for(var ya=0;ya<na.length&&(ta=na[ya],ma=ta+wa,xa=la(),null==sa[xa]);ya++);null!=sa[xa]&&(qa[wa]=ma)}oa=qa}var za=oa;
function u(a,b,c){try{b=za[b]||b,"-ms-writing-mode"==b&&"vertical-rl"==c&&(c="tb-rl"),a.style.setProperty(b,c)}catch(d){}}function Aa(a,b,c){try{return a.style.getPropertyValue(za[b]||b)}catch(d){}return c||""}function Ba(){this.b=[]}Ba.prototype.append=function(a){this.b.push(a);return this};Ba.prototype.toString=function(){var a=this.b.join("");this.b=[a];return a};function Ca(a){return"\\"+a.charCodeAt(0).toString(16)+" "}function Da(a){return a.replace(/[^-_a-zA-Z0-9\u0080-\uFFFF]/g,Ca)}
function Fa(a){return a.replace(/[\u0000-\u001F"]/g,Ca)}function Ga(a){return a.replace(/[\s+&?=#\u007F-\uFFFF]+/g,encodeURIComponent)}function Ha(a){return!!a.match(/^[a-zA-Z\u009E\u009F\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F\u037B-\u037D\u0386\u0388-\u0482\u048A-\u0527]$/)}function Ia(a){return"\\u"+(65536|a.charCodeAt(0)).toString(16).substr(1)}function ha(a){return a.replace(/[^-a-zA-Z0-9_]/g,Ia)}function w(a){window.console&&window.console.log&&window.console.log(a)}
function Ja(a){if(!a)throw"Assert failed";}function Ka(a,b){for(var c=0,d=a;;){Ja(c<=d);Ja(0==c||!b(c-1));Ja(d==a||b(d));if(c==d)return c;var e=c+d>>1;b(e)?d=e:c=e+1}}function La(a,b){return a-b}function Ma(a,b){for(var c={},d=0;d<a.length;d++){var e=a[d],f=b(e);f&&!c[f]&&(c[f]=e)}return c}var Na={};function Oa(a,b){for(var c={},d=0;d<a.length;d++){var e=a[d],f=b(e);f&&(c[f]?c[f].push(e):c[f]=[e])}return c}function Pa(a,b){for(var c=Array(a.length),d=0;d<a.length;d++)c[d]=b(a[d],d);return c}
function Qa(a,b){var c={},d;for(d in a)c[d]=b(a[d],d);return c}function Ra(){this.d={}}function Sa(a,b){var c=a.d[b.type];if(c){b.target=a;b.currentTarget=a;for(var d=0;d<c.length;d++)c[d](b)}}Ra.prototype.addEventListener=function(a,b,c){c||((c=this.d[a])?c.push(b):this.d[a]=[b])};Ra.prototype.removeEventListener=function(a,b,c){!c&&(a=this.d[a])&&(b=a.indexOf(b),0<=b&&a.splice(b,0))};var Ta=null;
function Ua(a){if(null==Ta){var b=a.ownerDocument,c=b.createElement("div");c.style.position="absolute";c.style.top="0px";c.style.left="0px";c.style.width="100px";c.style.height="100px";c.style.overflow="hidden";c.style.lineHeight="16px";c.style.fontSize="16px";a.appendChild(c);var d=b.createElement("div");d.style.width="0px";d.style.height="14px";d.style.cssFloat="left";c.appendChild(d);d=b.createElement("div");d.style.width="50px";d.style.height="50px";d.style.cssFloat="left";d.style.clear="left";
c.appendChild(d);d=b.createTextNode("a a a a a a a a a a a a a a a a");c.appendChild(d);b=b.createRange();b.setStart(d,0);b.setEnd(d,1);Ta=40>b.getBoundingClientRect().left;a.removeChild(c)}return Ta}var Va=null;function Wa(a){return 1==a.nodeType&&(a=a.getAttribute("id"))&&a.match(/^[-a-zA-Z_0-9.\u007F-\uFFFF]+$/)?a:null}function Xa(a){return"^"+a}function Ya(a){return a.substr(1)}function Za(a){return a?a.replace(/\^[\[\]\(\),=;^]/g,Ya):a}
function $a(a){for(var b={};a;){var c=a.match(/^;([^;=]+)=(([^;]|\^;)*)/);if(!c)break;var d=c[1],e;a:{e=c[2];var f=[];do{var g=e.match(/^(\^,|[^,])*/),k=Za(g[0]);e=e.substr(g[0].length+1);if(!e&&!f.length){e=k;break a}f.push(k)}while(e);e=f}b[d]=e;a=a.substr(c[0].length)}return b}function ab(){}ab.prototype.e=function(a){a.append("!")};ab.prototype.f=function(){return!1};function bb(a,b,c){this.b=a;this.id=b;this.Sa=c}
bb.prototype.e=function(a){a.append("/");a.append(this.b.toString());if(this.id||this.Sa)a.append("["),this.id&&a.append(this.id),this.Sa&&(a.append(";s="),a.append(this.Sa)),a.append("]")};
bb.prototype.f=function(a){if(1!=a.ea.nodeType)throw Error("E_CFI_NOT_ELEMENT");var b=a.ea,c=b.children,d=c.length,e=Math.floor(this.b/2)-1;0>e||0==d?(c=b.firstChild,a.ea=c||b):(c=c[Math.min(e,d-1)],this.b&1&&((b=c.nextSibling)&&1!=b.nodeType?c=b:a.K=!0),a.ea=c);if(this.id&&(a.K||this.id!=Wa(a.ea)))throw Error("E_CFI_ID_MISMATCH");a.Sa=this.Sa;return!0};function cb(a,b,c,d){this.offset=a;this.d=b;this.b=c;this.Sa=d}
cb.prototype.f=function(a){if(0<this.offset&&!a.K){for(var b=this.offset,c=a.ea;;){var d=c.nodeType;if(1==d)break;var e=c.nextSibling;if(3<=d&&5>=d){d=c.textContent.length;if(b<=d)break;if(!e){b=d;break}b-=d}if(!e){b=0;break}c=e}a.ea=c;a.offset=b}a.Sa=this.Sa;return!0};
cb.prototype.e=function(a){a.append(":");a.append(this.offset.toString());if(this.d||this.b||this.Sa){a.append("[");if(this.d||this.b)this.d&&a.append(this.d.replace(/[\[\]\(\),=;^]/g,Xa)),a.append(","),this.b&&a.append(this.b.replace(/[\[\]\(\),=;^]/g,Xa));this.Sa&&(a.append(";s="),a.append(this.Sa));a.append("]")}};function db(){this.ia=null}
function eb(a,b){var c=b.match(/^#?epubcfi\((.*)\)$/);if(!c)throw Error("E_CFI_NOT_CFI");for(var d=c[1],e=0,f=[];;)switch(d.charAt(e)){case "/":e++;c=d.substr(e).match(/^(0|[1-9][0-9]*)(\[([-a-zA-Z_0-9.\u007F-\uFFFF]+)(;([^\]]|\^\])*)?\])?/);if(!c)throw Error("E_CFI_NUMBER_EXPECTED");var e=e+c[0].length,g=parseInt(c[1],10),k=c[3],c=$a(c[4]);f.push(new bb(g,k,ja(c.s)));break;case ":":e++;c=d.substr(e).match(/^(0|[1-9][0-9]*)(\[((([^\];,]|\^[\];,])*)(,(([^\];,]|\^[\];,])*))?)(;([^]]|\^\])*)?\])?/);
if(!c)throw Error("E_CFI_NUMBER_EXPECTED");e+=c[0].length;g=parseInt(c[1],10);(k=c[4])&&(k=Za(k));var h=c[7];h&&(h=Za(h));c=$a(c[10]);f.push(new cb(g,k,h,ja(c.s)));break;case "!":e++;f.push(new ab);break;case "~":case "@":case "":a.ia=f;return;default:throw Error("E_CFI_PARSE_ERROR");}}function fb(a,b){for(var c={ea:b.documentElement,offset:0,K:!1,Sa:null,Jb:null},d=0;d<a.ia.length;d++)if(!a.ia[d].f(c)){++d<a.ia.length&&(c.Jb=new db,c.Jb.ia=a.ia.slice(d));break}return c}
function gb(a,b){return a.replace(/\s+/g," ").match(b?/^[ -\uD7FF\uE000-\uFFFF]{0,8}/:/[ -\uD7FF\uE000-\uFFFF]{0,8}$/)[0].replace(/^\s/,"").replace(/\s$/,"")}
function hb(a,b,c){for(var d=!1,e=null,f=[],g=b.parentNode,k="",h="";b;){switch(b.nodeType){case 3:case 4:case 5:var l=b.textContent,n=l.length;d?(c+=n,k||(k=l)):(c>n&&(c=n),d=!0,k=l.substr(0,c),h=l.substr(c));b=b.previousSibling;continue;case 8:b=b.previousSibling;continue}break}if(0<c||k||h)k=gb(k,!1),h=gb(h,!0),f.push(new cb(c,k,h,e)),e=null;for(;g&&g&&9!=g.nodeType;){c=d?null:Wa(b);for(d=d?1:0;b;)1==b.nodeType&&(d+=2),b=b.previousSibling;f.push(new bb(d,c,e));e=null;b=g;g=g.parentNode;d=!1}f.reverse();
a.ia?(f.push(new ab),a.ia=f.concat(a.ia)):a.ia=f}db.prototype.toString=function(){if(!this.ia)return"";var a=new Ba;a.append("epubcfi(");for(var b=0;b<this.ia.length;b++)this.ia[b].e(a);a.append(")");return a.toString()};function ib(a){a=a.substr(1);if(a.match(/^[^0-9a-fA-F\n\r]$/))return a;a=parseInt(a,16);return isNaN(a)?"":65535>=a?String.fromCharCode(a):1114111>=a?String.fromCharCode(55296|a>>10&1023,56320|a&1023):"\ufffd"}function jb(a){return a.replace(/\\([0-9a-fA-F]{0,6}(\r\n|[ \n\r\t\f])?|[^0-9a-fA-F\n\r])/g,ib)}function kb(){this.type=0;this.b=!1;this.C=0;this.text="";this.position=0}
function lb(a,b){var c=Array(128),d;for(d=0;128>d;d++)c[d]=a;c[NaN]=35==a?35:72;for(d=0;d<b.length;d+=2)c[b[d]]=b[d+1];return c}var nb=[72,72,72,72,72,72,72,72,72,1,1,72,1,1,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,1,4,34,6,7,8,9,33,10,11,12,13,14,15,16,17,2,2,2,2,2,2,2,2,2,2,18,19,20,21,22,23,24,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,25,29,26,30,3,72,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,27,31,28,32,72];nb[NaN]=80;
var ob=[43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,52,43,43,43,43,39,43,43,39,39,39,39,39,39,39,39,39,39,43,43,43,43,43,43,43,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,43,44,43,43,39,43,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,43,43,43,43,43];ob[NaN]=43;
var pb=[72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,78,59,72,59,59,59,59,59,59,59,59,59,59,72,72,72,72,72,72,72,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,72,61,72,72,78,72,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,72,72,72,72,72];ob[NaN]=43;
var qb=[35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,35,57,59,35,58,58,58,58,58,58,58,58,58,58,35,35,35,35,35,35,35,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,35,61,35,35,60,35,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,60,35,35,35,35,35];qb[NaN]=35;
var rb=[45,45,45,45,45,45,45,45,45,73,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,45,73,45,45,45,45,45,45,45,53,45,45,45,45,45,45,45,39,39,39,39,39,39,39,39,39,39,45,45,45,45,45,45,45,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,45,44,45,45,39,45,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,39,45,45,45,45,45];rb[NaN]=45;
var sb=[37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,37,41,37,37,37,37,37,37,37,37,42,37,39,39,39,39,39,39,39,39,39,39,37,37,37,37,37,37,37,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,37,37,37,37,40,37,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,37,37,37,37,37];sb[NaN]=37;
var tb=[38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,38,41,38,38,38,38,38,38,38,38,38,38,39,39,39,39,39,39,39,39,39,39,38,38,38,38,38,38,38,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,38,38,38,38,40,38,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,38,38,38,38,38];tb[NaN]=38;
var ub=lb(35,[61,36]),vb=lb(35,[58,77]),wb=lb(35,[61,36,124,50]),xb=lb(35,[38,51]),yb=lb(35,[42,54]),zb=lb(39,[42,55]),Ab=lb(54,[42,55,47,56]),Bb=lb(62,[62,56]),Cb=lb(35,[61,36,33,70]),Db=lb(62,[45,71]),Eb=lb(63,[45,56]),Fb=lb(76,[9,72,10,72,13,72,32,72]),Gb=lb(39,[39,46,10,72,13,72,92,48]),Hb=lb(39,[34,46,10,72,13,72,92,49]),Ib=lb(39,[39,47,10,74,13,74,92,48]),Jb=lb(39,[34,47,10,74,13,74,92,49]),Kb=lb(64,[9,39,32,39,34,66,39,65,41,72,10,39,13,39]),Lb=lb(39,[41,67,9,79,10,79,13,79,32,79,92,75,40,
72,91,72,93,72,123,72,125,72,NaN,67]),Mb=lb(39,[39,68,10,74,13,74,92,75,NaN,67]),Nb=lb(39,[34,68,10,74,13,74,92,75,NaN,67]),Ob=lb(72,[9,39,10,39,13,39,32,39,41,69]);function Pb(a){this.e=15;this.h=a;this.g=Array(this.e+1);this.b=-1;for(a=this.position=this.d=this.f=0;a<=this.e;a++)this.g[a]=new kb}function x(a){a.f==a.d&&Qb(a);return a.g[a.d]}function z(a,b){(a.f-a.d&a.e)<=b&&Qb(a);return a.g[a.d+b&a.e]}function A(a){a.d=a.d+1&a.e}
function Qb(a){var b=a.f,c=0<=a.b?a.b:a.d,d=a.e;b>=c?c+=d:c--;if(c==b){if(0>a.b)throw Error("F_CSSTOK_INTERNAL");for(var b=2*(a.e+1)-1,c=Array(b+1),d=a.b,e=0;d!=a.f;)c[e]=a.g[d],d==a.d&&(a.d=e),d=d+1&a.e,e++;a.b=0;a.f=e;a.e=b;for(a.g=c;e<=b;)c[e++]=new kb;b=a.f;c=d=a.e}for(var e=nb,f=a.h,g=a.position,k=a.g,h=0,l=0,n="",p=0,q=!1,r=k[b],v=-9;;){var y=f.charCodeAt(g);switch(e[y]||e[65]){case 72:h=51;n=isNaN(y)?"E_CSS_UNEXPECTED_EOF":"E_CSS_UNEXPECTED_CHAR";g++;break;case 1:g++;q=!0;continue;case 2:l=
g++;e=sb;continue;case 3:h=1;l=g++;e=ob;continue;case 4:l=g++;h=31;e=ub;continue;case 33:h=2;l=++g;e=Gb;continue;case 34:h=2;l=++g;e=Hb;continue;case 6:l=++g;h=7;e=ob;continue;case 7:l=g++;h=32;e=ub;continue;case 8:l=g++;h=21;break;case 9:l=g++;h=32;e=xb;continue;case 10:l=g++;h=10;break;case 11:l=g++;h=11;break;case 12:l=g++;h=36;e=ub;continue;case 13:l=g++;h=23;break;case 14:l=g++;h=16;break;case 15:h=24;l=g++;e=qb;continue;case 16:l=g++;e=pb;continue;case 78:l=g++;h=9;e=ob;continue;case 17:l=g++;
h=19;e=yb;continue;case 18:l=g++;h=18;e=vb;continue;case 77:g++;h=50;break;case 19:l=g++;h=17;break;case 20:l=g++;h=38;e=Cb;continue;case 21:l=g++;h=39;e=ub;continue;case 22:l=g++;h=37;e=ub;continue;case 23:l=g++;h=22;break;case 24:l=++g;h=20;e=ob;continue;case 25:l=g++;h=14;break;case 26:l=g++;h=15;break;case 27:l=g++;h=12;break;case 28:l=g++;h=13;break;case 29:v=l=g++;h=1;e=Fb;continue;case 30:l=g++;h=33;e=ub;continue;case 31:l=g++;h=34;e=wb;continue;case 32:l=g++;h=35;e=ub;continue;case 35:break;
case 36:g++;h=h+41-31;break;case 37:h=5;p=parseInt(f.substring(l,g),10);break;case 38:h=4;p=parseFloat(f.substring(l,g));break;case 39:g++;continue;case 40:h=3;p=parseFloat(f.substring(l,g));l=g++;e=ob;continue;case 41:h=3;p=parseFloat(f.substring(l,g));n="%";l=g++;break;case 42:g++;e=tb;continue;case 43:n=f.substring(l,g);break;case 44:v=g++;e=Fb;continue;case 45:n=jb(f.substring(l,g));break;case 46:n=f.substring(l,g);g++;break;case 47:n=jb(f.substring(l,g));g++;break;case 48:v=g;g+=2;e=Ib;continue;
case 49:v=g;g+=2;e=Jb;continue;case 50:g++;h=25;break;case 51:g++;h=26;break;case 52:n=f.substring(l,g);if(1==h){g++;if("url"==n.toLowerCase()){e=Kb;continue}h=6}break;case 53:n=jb(f.substring(l,g));if(1==h){g++;if("url"==n.toLowerCase()){e=Kb;continue}h=6}break;case 54:e=zb;g++;continue;case 55:e=Ab;g++;continue;case 56:e=nb;g++;continue;case 57:e=Bb;g++;continue;case 58:h=5;e=sb;g++;continue;case 59:h=4;e=tb;g++;continue;case 60:h=1;e=ob;g++;continue;case 61:h=1;e=Fb;v=g++;continue;case 62:g--;
break;case 63:g-=2;break;case 64:l=g++;e=Lb;continue;case 65:l=++g;e=Mb;continue;case 66:l=++g;e=Nb;continue;case 67:h=8;n=jb(f.substring(l,g));g++;break;case 69:g++;break;case 70:e=Db;g++;continue;case 71:e=Eb;g++;continue;case 79:if(8>g-v&&f.substring(v+1,g+1).match(/^[0-9a-fA-F]{0,6}(\r\n|[\n\r])|[ \t]$/)){g++;continue}case 68:h=8;n=jb(f.substring(l,g));g++;e=Ob;continue;case 74:g++;if(9>g-v&&f.substring(v+1,g).match(/^[0-9a-fA-F]{0,6}(\r\n|[\n\r])$/))continue;h=51;n="E_CSS_UNEXPECTED_NEWLINE";
break;case 73:if(9>g-v&&f.substring(v+1,g+1).match(/^[0-9a-fA-F]{0,6}[ \t]$/)){g++;continue}n=jb(f.substring(l,g));break;case 75:v=g++;continue;case 76:g++;e=rb;continue;default:if(e!==nb){h=51;n="E_CSS_UNEXPECTED_STATE";break}l=g;h=0}r.type=h;r.b=q;r.C=p;r.text=n;r.position=l;b++;if(b>=c)break;e=nb;q=!1;r=k[b&d]}a.position=g;a.f=b&d};function Rb(){return{fontFamily:"serif",lineHeight:1.25,margin:8,Ac:!0,wc:25,zc:!1,Ic:!1,Wa:!1,Fb:1,Wc:{print:!0}}}function Sb(a){return{fontFamily:a.fontFamily,lineHeight:a.lineHeight,margin:a.margin,Ac:a.Ac,wc:a.wc,zc:a.zc,Ic:a.Ic,Wa:a.Wa,Fb:a.Fb,Wc:Object.Cb({},a.Wc)}}var Tb=Rb(),Ub={};function Vb(a,b,c,d){var e=Math.min((a-0)/c,(b-0)/d);return"matrix("+e+",0,0,"+e+","+(a-c)/2+","+(b-d)/2+")"}function Wb(a){return'"'+Fa(a+"")+'"'}function Xb(a){return Da(a+"")}
function Yb(a,b){return a?Da(a)+"."+Da(b):Da(b)}var Zb=0;
function $b(a,b){this.parent=a;this.j="S"+Zb++;this.children=[];this.b=new B(this,0);this.d=new B(this,1);this.g=new B(this,!0);this.f=new B(this,!1);a&&a.children.push(this);this.values={};this.l={};this.k={};this.h=b;if(!a){var c=this.k;c.floor=Math.floor;c.ceil=Math.ceil;c.round=Math.round;c.sqrt=Math.sqrt;c.min=Math.min;c.max=Math.max;c.letterbox=Vb;c["css-string"]=Wb;c["css-name"]=Xb;c["typeof"]=function(a){return typeof a};ac(this,"page-width",function(){return this.u()});ac(this,"page-height",
function(){return this.l()});ac(this,"pref-font-family",function(){return this.R.fontFamily});ac(this,"pref-night-mode",function(){return this.R.Ic});ac(this,"pref-hyphenate",function(){return this.R.Ac});ac(this,"pref-margin",function(){return this.R.margin});ac(this,"pref-line-height",function(){return this.R.lineHeight});ac(this,"pref-column-width",function(){return this.R.wc*this.fontSize});ac(this,"pref-horizontal",function(){return this.R.zc});ac(this,"pref-spread-view",function(){return this.R.Wa})}}
function ac(a,b,c){a.values[b]=new bc(a,c,b)}function cc(a,b){a.values["page-number"]=b}function dc(a,b){a.k["has-content"]=b}var ec={px:1,"in":96,pt:4/3,pc:16,cm:96/2.54,mm:96/25.4,q:96/2.54/40,em:16,rem:16,ex:8,rex:8};function fc(a,b,c,d){this.A=null;this.u=function(){return this.A?this.A:this.R.Wa?Math.floor(b/2)-this.R.Fb:b};this.w=null;this.l=function(){return this.w?this.w:c};this.g=d;this.aa=null;this.fontSize=function(){return this.aa?this.aa:d};this.R=Tb;this.B={}}
function gc(a,b){a.B[b.j]={};for(var c=0;c<b.children.length;c++)gc(a,b.children[c])}function hc(a,b,c){return"vw"==b?a.u()/100:"vh"==b?a.l()/100:"em"==b||"rem"==b?c?a.g:a.fontSize():"ex"==b||"rex"==b?ec.ex*(c?a.g:a.fontSize())/ec.em:ec[b]}function ic(a,b,c){do{var d=b.values[c];if(d||b.h&&(d=b.h.call(a,c,!1)))return d;b=b.parent}while(b);throw Error("Name '"+c+"' is undefined");}
function jc(a,b,c,d,e){do{var f=b.l[c];if(f||b.h&&(f=b.h.call(a,c,!0)))return f;if(f=b.k[c]){if(e)return b.b;c=Array(d.length);for(e=0;e<d.length;e++)c[e]=d[e].evaluate(a);return new B(b,f.apply(a,c))}b=b.parent}while(b);throw Error("Function '"+c+"' is undefined");}
function kc(a,b,c){var d="",e=b.match(/^(min|max)-(.*)$/);e&&(d=e[1],b=e[2]);var f=e=null;switch(b){case "width":case "height":case "device-width":case "device-height":case "color":c&&(e=c.evaluate(a))}switch(b){case "width":f=a.u();break;case "height":f=a.l();break;case "device-width":f=window.screen.availWidth;break;case "device-height":f=window.screen.availHeight;break;case "color":f=window.screen.pixelDepth}if(null!=f&&null!=e)switch(d){case "min":return f>=e;case "max":return f<=e;default:return f==
e}else if(null!=f&&null==c)return 0!==f;return!1}function C(a){this.b=a;this.f="_"+Zb++}m=C.prototype;m.toString=function(){var a=new Ba;this.ka(a,0);return a.toString()};m.ka=function(){throw Error("F_ABSTRACT");};m.Ha=function(){throw Error("F_ABSTRACT");};m.Ba=function(){return this};m.kb=function(a){return a===this};function lc(a,b,c,d){var e=d[a.f];if(null!=e)return e===Ub?!1:e;d[a.f]=Ub;b=a.kb(b,c,d);return d[a.f]=b}
m.evaluate=function(a){var b;b=(b=a.B[this.b.j])?b[this.f]:void 0;if("undefined"!=typeof b)return b;b=this.Ha(a);var c=this.f,d=this.b,e=a.B[d.j];e||(e={},a.B[d.j]=e);return e[c]=b};m.Zc=function(){return!1};function mc(a,b){C.call(this,a);this.d=b}t(mc,C);m=mc.prototype;m.Vc=function(){throw Error("F_ABSTRACT");};m.Xc=function(){throw Error("F_ABSTRACT");};m.Ha=function(a){a=this.d.evaluate(a);return this.Xc(a)};m.kb=function(a,b,c){return a===this||lc(this.d,a,b,c)};
m.ka=function(a,b){10<b&&a.append("(");a.append(this.Vc());this.d.ka(a,10);10<b&&a.append(")")};m.Ba=function(a,b){var c=this.d.Ba(a,b);return c===this.d?this:new this.constructor(this.b,c)};function D(a,b,c){C.call(this,a);this.d=b;this.e=c}t(D,C);m=D.prototype;m.Vb=function(){throw Error("F_ABSTRACT");};m.Aa=function(){throw Error("F_ABSTRACT");};m.Qa=function(){throw Error("F_ABSTRACT");};m.Ha=function(a){var b=this.d.evaluate(a);a=this.e.evaluate(a);return this.Qa(b,a)};
m.kb=function(a,b,c){return a===this||lc(this.d,a,b,c)||lc(this.e,a,b,c)};m.ka=function(a,b){var c=this.Vb();c<=b&&a.append("(");this.d.ka(a,c);a.append(this.Aa());this.e.ka(a,c);c<=b&&a.append(")")};m.Ba=function(a,b){var c=this.d.Ba(a,b),d=this.e.Ba(a,b);return c===this.d&&d===this.e?this:new this.constructor(this.b,c,d)};function nc(a,b,c){D.call(this,a,b,c)}t(nc,D);nc.prototype.Vb=function(){return 1};function oc(a,b,c){D.call(this,a,b,c)}t(oc,D);oc.prototype.Vb=function(){return 2};
function pc(a,b,c){D.call(this,a,b,c)}t(pc,D);pc.prototype.Vb=function(){return 3};function qc(a,b,c){D.call(this,a,b,c)}t(qc,D);qc.prototype.Vb=function(){return 4};function rc(a,b){mc.call(this,a,b)}t(rc,mc);rc.prototype.Vc=function(){return"!"};rc.prototype.Xc=function(a){return!a};function sc(a,b){mc.call(this,a,b)}t(sc,mc);sc.prototype.Vc=function(){return"-"};sc.prototype.Xc=function(a){return-a};function tc(a,b,c){D.call(this,a,b,c)}t(tc,nc);tc.prototype.Aa=function(){return"&&"};
tc.prototype.Ha=function(a){return this.d.evaluate(a)&&this.e.evaluate(a)};function uc(a,b,c){D.call(this,a,b,c)}t(uc,tc);uc.prototype.Aa=function(){return" and "};function vc(a,b,c){D.call(this,a,b,c)}t(vc,nc);vc.prototype.Aa=function(){return"||"};vc.prototype.Ha=function(a){return this.d.evaluate(a)||this.e.evaluate(a)};function wc(a,b,c){D.call(this,a,b,c)}t(wc,vc);wc.prototype.Aa=function(){return", "};function xc(a,b,c){D.call(this,a,b,c)}t(xc,oc);xc.prototype.Aa=function(){return"<"};
xc.prototype.Qa=function(a,b){return a<b};function yc(a,b,c){D.call(this,a,b,c)}t(yc,oc);yc.prototype.Aa=function(){return"<="};yc.prototype.Qa=function(a,b){return a<=b};function zc(a,b,c){D.call(this,a,b,c)}t(zc,oc);zc.prototype.Aa=function(){return">"};zc.prototype.Qa=function(a,b){return a>b};function Ac(a,b,c){D.call(this,a,b,c)}t(Ac,oc);Ac.prototype.Aa=function(){return">="};Ac.prototype.Qa=function(a,b){return a>=b};function Bc(a,b,c){D.call(this,a,b,c)}t(Bc,oc);Bc.prototype.Aa=function(){return"=="};
Bc.prototype.Qa=function(a,b){return a==b};function Cc(a,b,c){D.call(this,a,b,c)}t(Cc,oc);Cc.prototype.Aa=function(){return"!="};Cc.prototype.Qa=function(a,b){return a!=b};function Dc(a,b,c){D.call(this,a,b,c)}t(Dc,pc);Dc.prototype.Aa=function(){return"+"};Dc.prototype.Qa=function(a,b){return a+b};function Ec(a,b,c){D.call(this,a,b,c)}t(Ec,pc);Ec.prototype.Aa=function(){return" - "};Ec.prototype.Qa=function(a,b){return a-b};function Fc(a,b,c){D.call(this,a,b,c)}t(Fc,qc);Fc.prototype.Aa=function(){return"*"};
Fc.prototype.Qa=function(a,b){return a*b};function Gc(a,b,c){D.call(this,a,b,c)}t(Gc,qc);Gc.prototype.Aa=function(){return"/"};Gc.prototype.Qa=function(a,b){return a/b};function Hc(a,b,c){D.call(this,a,b,c)}t(Hc,qc);Hc.prototype.Aa=function(){return"%"};Hc.prototype.Qa=function(a,b){return a%b};function Ic(a,b,c){C.call(this,a);this.C=b;this.ja=c}t(Ic,C);Ic.prototype.ka=function(a){a.append(this.C.toString());a.append(Da(this.ja))};Ic.prototype.Ha=function(a){return this.C*hc(a,this.ja,!1)};
function Jc(a,b){C.call(this,a);this.d=b}t(Jc,C);Jc.prototype.ka=function(a){a.append(this.d)};Jc.prototype.Ha=function(a){return ic(a,this.b,this.d).evaluate(a)};Jc.prototype.kb=function(a,b,c){return a===this||lc(ic(b,this.b,this.d),a,b,c)};function Kc(a,b,c){C.call(this,a);this.d=b;this.name=c}t(Kc,C);Kc.prototype.ka=function(a){this.d&&a.append("not ");a.append(Da(this.name))};Kc.prototype.Ha=function(a){var b=this.name;a="all"===b||!!a.R.Wc[b];return this.d?!a:a};
Kc.prototype.kb=function(a,b,c){return a===this||lc(this.value,a,b,c)};Kc.prototype.Zc=function(){return!0};function bc(a,b,c){C.call(this,a);this.sb=b;this.d=c}t(bc,C);bc.prototype.ka=function(a){a.append(this.d)};bc.prototype.Ha=function(a){return this.sb.call(a)};function Lc(a,b,c){C.call(this,a);this.e=b;this.d=c}t(Lc,C);Lc.prototype.ka=function(a){a.append(this.e);var b=this.d;a.append("(");for(var c=0;c<b.length;c++)c&&a.append(","),b[c].ka(a,0);a.append(")")};
Lc.prototype.Ha=function(a){return jc(a,this.b,this.e,this.d,!1).Ba(a,this.d).evaluate(a)};Lc.prototype.kb=function(a,b,c){if(a===this)return!0;for(var d=0;d<this.d.length;d++)if(lc(this.d[d],a,b,c))return!0;return lc(jc(b,this.b,this.e,this.d,!0),a,b,c)};Lc.prototype.Ba=function(a,b){for(var c,d=c=this.d,e=0;e<c.length;e++){var f=c[e].Ba(a,b);if(c!==d)d[e]=f;else if(f!==c[e]){for(var d=Array(c.length),g=0;g<e;g++)d[g]=c[g];d[e]=f}}c=d;return c===this.d?this:new Lc(this.b,this.e,c)};
function Mc(a,b,c,d){C.call(this,a);this.d=b;this.g=c;this.e=d}t(Mc,C);Mc.prototype.ka=function(a,b){0<b&&a.append("(");this.d.ka(a,0);a.append("?");this.g.ka(a,0);a.append(":");this.e.ka(a,0);0<b&&a.append(")")};Mc.prototype.Ha=function(a){return this.d.evaluate(a)?this.g.evaluate(a):this.e.evaluate(a)};Mc.prototype.kb=function(a,b,c){return a===this||lc(this.d,a,b,c)||lc(this.g,a,b,c)||lc(this.e,a,b,c)};
Mc.prototype.Ba=function(a,b){var c=this.d.Ba(a,b),d=this.g.Ba(a,b),e=this.e.Ba(a,b);return c===this.d&&d===this.g&&e===this.e?this:new Mc(this.b,c,d,e)};function B(a,b){C.call(this,a);this.d=b}t(B,C);B.prototype.ka=function(a){switch(typeof this.d){case "number":case "boolean":a.append(this.d.toString());break;case "string":a.append('"');a.append(Fa(this.d));a.append('"');break;default:throw Error("F_UNEXPECTED_STATE");}};B.prototype.Ha=function(){return this.d};
function Nc(a,b,c){C.call(this,a);this.name=b;this.value=c}t(Nc,C);Nc.prototype.ka=function(a){a.append("(");a.append(Fa(this.name.name));a.append(":");this.value.ka(a,0);a.append(")")};Nc.prototype.Ha=function(a){return kc(a,this.name.name,this.value)};Nc.prototype.kb=function(a,b,c){return a===this||lc(this.value,a,b,c)};Nc.prototype.Ba=function(a,b){var c=this.value.Ba(a,b);return c===this.value?this:new Nc(this.b,this.name,c)};function Oc(a,b){C.call(this,a);this.d=b}t(Oc,C);
Oc.prototype.ka=function(a){a.append("$");a.append(this.d.toString())};Oc.prototype.Ba=function(a,b){var c=b[this.d];if(!c)throw Error("Parameter missing: "+this.d);return c};function Pc(a,b,c){return b===a.f||b===a.b||c==a.f||c==a.b?a.f:b===a.g||b===a.d?c:c===a.g||c===a.d?b:new tc(a,b,c)}function F(a,b,c){return b===a.b?c:c===a.b?b:new Dc(a,b,c)}function G(a,b,c){return b===a.b?new sc(a,c):c===a.b?b:new Ec(a,b,c)}function Qc(a,b,c){return b===a.b||c===a.b?a.b:b===a.d?c:c===a.d?b:new Fc(a,b,c)}
function Rc(a,b,c){return b===a.b?a.b:c===a.d?b:new Gc(a,b,c)};var Sc={};function Tc(){}m=Tc.prototype;m.ib=function(a){for(var b=0;b<a.length;b++)a[b].S(this)};m.Pc=function(){throw Error("E_CSS_EMPTY_NOT_ALLOWED");};m.Qc=function(){throw Error("E_CSS_SLASH_NOT_ALLOWED");};m.Ob=function(){throw Error("E_CSS_STR_NOT_ALLOWED");};m.hb=function(){throw Error("E_CSS_IDENT_NOT_ALLOWED");};m.Ab=function(){throw Error("E_CSS_NUMERIC_NOT_ALLOWED");};m.zb=function(){throw Error("E_CSS_NUM_NOT_ALLOWED");};m.yb=function(a){return this.zb(a)};
m.mc=function(){throw Error("E_CSS_COLOR_NOT_ALLOWED");};m.Pb=function(){throw Error("E_CSS_URL_NOT_ALLOWED");};m.Xa=function(){throw Error("E_CSS_LIST_NOT_ALLOWED");};m.nb=function(){throw Error("E_CSS_COMMA_NOT_ALLOWED");};m.ob=function(){throw Error("E_CSS_FUNC_NOT_ALLOWED");};m.xb=function(){throw Error("E_CSS_EXPR_NOT_ALLOWED");};function Uc(){}t(Uc,Tc);m=Uc.prototype;
m.ib=function(a){for(var b=null,c=0;c<a.length;c++){var d=a[c],e=d.S(this);if(b)b[c]=e;else if(d!==e){b=Array(a.length);for(d=0;d<c;d++)b[d]=a[d];b[c]=e}}return b||a};m.Ob=function(a){return a};m.hb=function(a){return a};m.Qc=function(a){return a};m.Ab=function(a){return a};m.zb=function(a){return a};m.yb=function(a){return a};m.mc=function(a){return a};m.Pb=function(a){return a};m.Xa=function(a){var b=this.ib(a.values);return b===a.values?a:new Vc(b)};
m.nb=function(a){var b=this.ib(a.values);return b===a.values?a:new Wc(b)};m.ob=function(a){var b=this.ib(a.values);return b===a.values?a:new Xc(a.name,b)};m.xb=function(a){return a};function Yc(){}m=Yc.prototype;m.toString=function(){var a=new Ba;this.xa(a,!0);return a.toString()};m.stringValue=function(){var a=new Ba;this.xa(a,!1);return a.toString()};m.fa=function(){throw Error("F_ABSTRACT");};m.xa=function(a){a.append("[error]")};m.Yc=function(){return!1};m.Fc=function(){return!1};m.$c=function(){return!1};
m.od=function(){return!1};m.ad=function(){return!1};function Zc(){if(H)throw Error("E_INVALID_CALL");}t(Zc,Yc);Zc.prototype.fa=function(a){return new B(a,"")};Zc.prototype.xa=function(){};Zc.prototype.S=function(a){return a.Pc(this)};var H=new Zc;function $c(){if(ad)throw Error("E_INVALID_CALL");}t($c,Yc);$c.prototype.fa=function(a){return new B(a,"/")};$c.prototype.xa=function(a){a.append("/")};$c.prototype.S=function(a){return a.Qc(this)};var ad=new $c;function bd(a){this.b=a}t(bd,Yc);
bd.prototype.fa=function(a){return new B(a,this.b)};bd.prototype.xa=function(a,b){b?(a.append('"'),a.append(Fa(this.b)),a.append('"')):a.append(this.b)};bd.prototype.S=function(a){return a.Ob(this)};function cd(a){this.name=a;if(Sc[a])throw Error("E_INVALID_CALL");Sc[a]=this}t(cd,Yc);cd.prototype.fa=function(a){return new B(a,this.name)};cd.prototype.xa=function(a,b){b?a.append(Da(this.name)):a.append(this.name)};cd.prototype.S=function(a){return a.hb(this)};cd.prototype.od=function(){return!0};
function J(a){var b=Sc[a];b||(b=new cd(a));return b}function K(a,b){this.C=a;this.ja=b}t(K,Yc);K.prototype.fa=function(a,b){return 0==this.C?a.b:b&&"%"==this.ja?100==this.C?b:new Fc(a,b,new B(a,this.C/100)):new Ic(a,this.C,this.ja)};K.prototype.xa=function(a){a.append(this.C.toString());a.append(this.ja)};K.prototype.S=function(a){return a.Ab(this)};K.prototype.Fc=function(){return!0};function dd(a){this.C=a}t(dd,Yc);dd.prototype.fa=function(a){return 0==this.C?a.b:1==this.C?a.d:new B(a,this.C)};
dd.prototype.xa=function(a){a.append(this.C.toString())};dd.prototype.S=function(a){return a.zb(this)};dd.prototype.$c=function(){return!0};function ed(a){this.C=a}t(ed,dd);ed.prototype.S=function(a){return a.yb(this)};function fd(a){this.b=a}t(fd,Yc);fd.prototype.xa=function(a){a.append("#");var b=this.b.toString(16);a.append("000000".substr(b.length));a.append(b)};fd.prototype.S=function(a){return a.mc(this)};function gd(a){this.url=a}t(gd,Yc);
gd.prototype.xa=function(a){a.append('url("');a.append(Fa(this.url));a.append('")')};gd.prototype.S=function(a){return a.Pb(this)};function hd(a,b,c,d){var e=b.length;b[0].xa(a,d);for(var f=1;f<e;f++)a.append(c),b[f].xa(a,d)}function Vc(a){this.values=a}t(Vc,Yc);Vc.prototype.xa=function(a,b){hd(a,this.values," ",b)};Vc.prototype.S=function(a){return a.Xa(this)};Vc.prototype.ad=function(){return!0};function Wc(a){this.values=a}t(Wc,Yc);Wc.prototype.xa=function(a,b){hd(a,this.values,",",b)};
Wc.prototype.S=function(a){return a.nb(this)};function Xc(a,b){this.name=a;this.values=b}t(Xc,Yc);Xc.prototype.xa=function(a,b){a.append(Da(this.name));a.append("(");hd(a,this.values,",",b);a.append(")")};Xc.prototype.S=function(a){return a.ob(this)};function L(a){this.d=a}t(L,Yc);L.prototype.fa=function(){return this.d};L.prototype.xa=function(a){a.append("-epubx-expr(");this.d.ka(a,0);a.append(")")};L.prototype.S=function(a){return a.xb(this)};L.prototype.Yc=function(){return!0};
function id(a,b){if(a){if(a.Fc())return hc(b,a.ja,!1)*a.C;if(a.$c())return a.C}return 0}
var jd=J("absolute"),kd=J("all"),ld=J("auto"),md=J("avoid"),nd=J("block"),od=J("block-end"),pd=J("block-start"),qd=J("both"),rd=J("bottom"),sd=J("exclusive"),td=J("false"),ud=J("footnote"),vd=J("hidden"),wd=J("horizontal-tb"),xd=J("inherit"),yd=J("inline"),zd=J("inline-end"),Ad=J("inline-start"),Bd=J("landscape"),Cd=J("left"),Dd=J("list-item"),Ed=J("ltr"),Fd=J("none"),Gd=J("normal"),Hd=J("oeb-page-foot"),Id=J("oeb-page-head"),Jd=J("relative"),Kd=J("right"),Ld=J("scale"),Md=J("static"),Nd=J("rtl"),
Od=J("table"),Pd=J("table-row"),Qd=J("top"),Rd=J("transparent"),Sd=J("vertical-lr"),Td=J("vertical-rl"),Ud=J("visible"),Vd=J("true"),Wd=new K(100,"%"),Yd=new K(100,"vw"),Zd=new K(100,"vh"),$d=new K(0,"px"),ae={"font-size":1,color:2};function be(a,b){return(ae[a]||Number.MAX_VALUE)-(ae[b]||Number.MAX_VALUE)};function ce(a,b,c,d){this.W=a;this.T=b;this.U=c;this.P=d}function de(a,b){this.x=a;this.y=b}function ee(){this.bottom=this.right=this.top=this.left=0}function fe(a,b,c,d){this.b=a;this.d=b;this.f=c;this.e=d}function ge(a,b,c,d){this.T=a;this.P=b;this.W=c;this.U=d;this.right=this.left=null}function he(a,b){return a.b.y-b.b.y||a.b.x-b.b.x}function ie(a){this.b=a}function je(a,b,c){a=a.b;for(var d=a.length,e=a[d-1],f=0;f<d;f++){var g=a[f];b.push(e.y<g.y?new fe(e,g,1,c):new fe(g,e,-1,c));e=g}}
function ke(a,b,c){for(var d=[],e=0;e<a.b.length;e++){var f=a.b[e];d.push(new de(f.x+b,f.y+c))}return new ie(d)}function le(a,b,c,d){for(var e=[],f=0;20>f;f++){var g=2*f*Math.PI/20;e.push(new de(a+c*Math.sin(g),b+d*Math.cos(g)))}return new ie(e)}function me(a,b,c,d){return new ie([new de(a,b),new de(c,b),new de(c,d),new de(a,d)])}function ne(a,b,c,d){this.x=a;this.e=b;this.b=c;this.d=d}
function oe(a,b){var c=a.b.x+(a.d.x-a.b.x)*(b-a.b.y)/(a.d.y-a.b.y);if(isNaN(c))throw Error("Bad intersection");return c}function pe(a,b,c,d){var e,f;b.d.y<c&&w("Error: inconsistent segment (1)");b.b.y<=c?(c=oe(b,c),e=b.f):(c=b.b.x,e=0);b.d.y>=d?(d=oe(b,d),f=b.f):(d=b.d.x,f=0);c<d?(a.push(new ne(c,e,b.e,-1)),a.push(new ne(d,f,b.e,1))):(a.push(new ne(d,f,b.e,-1)),a.push(new ne(c,e,b.e,1)))}
function qe(a,b,c){c=b+c;for(var d=Array(c),e=Array(c),f=0;f<=c;f++)d[f]=0,e[f]=0;for(var g=[],k=!1,h=a.length,l=0;l<h;l++){var n=a[l];d[n.b]+=n.e;e[n.b]+=n.d;for(var p=!1,f=0;f<b;f++)if(d[f]&&!e[f]){p=!0;break}if(p)for(f=b;f<=c;f++)if(d[f]||e[f]){p=!1;break}k!=p&&(g.push(n.x),k=p)}return g}function re(a,b){return b?Math.ceil(a/b)*b:a}function se(a,b){return b?Math.floor(a/b)*b:a}function te(a){return new de(a.y,-a.x)}function ue(a){return new ce(a.T,-a.U,a.P,-a.W)}
function ve(a){return new ie(Pa(a.b,te))}
function we(a,b,c,d,e){e&&(a=ue(a),b=Pa(b,ve),c=Pa(c,ve));e=b.length;var f=c?c.length:0,g=[],k=[],h,l,n;for(h=0;h<e;h++)je(b[h],k,h);for(h=0;h<f;h++)je(c[h],k,h+e);b=k.length;k.sort(he);for(c=0;k[c].e>=e;)c++;c=k[c].b.y;c>a.T&&g.push(new ge(a.T,c,a.U,a.U));h=0;for(var p=[];h<b&&(n=k[h]).b.y<c;)n.d.y>c&&p.push(n),h++;for(;h<b||0<p.length;){var q=a.P,r=re(Math.ceil(c+8),d);for(l=0;l<p.length&&q>r;l++)n=p[l],n.b.x==n.d.x?n.d.y<q&&(q=Math.max(se(n.d.y,d),r)):n.b.x!=n.d.x&&(q=r);q>a.P&&(q=a.P);for(;h<
b&&(n=k[h]).b.y<q;)if(n.d.y<c)h++;else if(n.b.y<r){if(n.b.y!=n.d.y||n.b.y!=c)p.push(n),q=r;h++}else{l=se(n.b.y,d);l<q&&(q=l);break}r=[];for(l=0;l<p.length;l++)pe(r,p[l],c,q);r.sort(function(a,b){return a.x-b.x||a.d-b.d});r=qe(r,e,f);if(0==r.length)g.push(new ge(c,q,a.U,a.U));else{var v=0,y=a.W;for(l=0;l<r.length;l+=2){var I=Math.max(a.W,r[l]),W=Math.min(a.U,r[l+1])-I;W>v&&(v=W,y=I)}0==v?g.push(new ge(c,q,a.U,a.U)):g.push(new ge(c,q,Math.max(y,a.W),Math.min(y+v,a.U)))}if(q==a.P)break;c=q;for(l=p.length-
1;0<=l;l--)p[l].d.y<=q&&p.splice(l,1)}xe(a,g);return g}function xe(a,b){for(var c=b.length-1,d=new ge(a.P,a.P,a.W,a.U);0<=c;){var e=d,d=b[c];d.W==e.W&&d.U==e.U&&(e.T=d.T,b.splice(c,1),d=e);c--}}function ye(a,b){for(var c=0,d=a.length;c<d;){var e=Math.floor((c+d)/2);b>=a[e].P?c=e+1:d=e}return c}
function ze(a,b,c,d){for(var e=c.T,f=c.U-c.W,g=c.P-c.T,k=ye(b,e);;){var h=e+g;if(h>a.P)break;for(var l=a.W,n=a.U,p=k;p<b.length&&b[p].T<h;p++){var q=b[p];q.W>l&&(l=q.W);q.U<n&&(n=q.U)}if(l+f<=n||k>=b.length){"left"==d?(c.W=l,c.U=l+f):(c.W=n-f,c.U=n);c.P+=e-c.T;c.T=e;break}e=b[k].P;k++}}
function Ae(a,b,c,d){for(var e=null,e=[new ge(c.T,c.P,c.W,c.U)];0<e.length&&e[0].P<=a.T;)e.shift();if(0!=e.length){e[0].T<a.T&&(e[0].T=a.T);c=0==b.length?a.T:b[b.length-1].P;c<a.P&&b.push(new ge(c,a.P,a.W,a.U));for(var f=ye(b,e[0].T),g=0;g<e.length;g++){var k=e[g];if(f==b.length)break;b[f].T<k.T&&(c=b[f],f++,b.splice(f,0,new ge(k.T,c.P,c.W,c.U)),c.P=k.T);for(;f<b.length&&(c=b[f++],c.P>k.P&&(b.splice(f,0,new ge(k.P,c.P,c.W,c.U)),c.P=k.P),k.W!=k.U&&("left"==d?c.W=k.U:c.U=k.W),c.P!=k.P););}xe(a,b)}}
;function Be(a){return String.fromCharCode(a>>>24&255,a>>>16&255,a>>>8&255,a&255)}
function Ce(a){var b=new Ba;b.append(a);var c=55-a.length&63;for(b.append("\u0080");0<c;)c--,b.append("\x00");b.append("\x00\x00\x00\x00");b.append(Be(8*a.length));a=b.toString();for(var b=[1732584193,4023233417,2562383102,271733878,3285377520],c=[],d,e=0;e<a.length;e+=64){for(d=0;16>d;d++){var f=a.substr(e+4*d,4);c[d]=(f.charCodeAt(0)&255)<<24|(f.charCodeAt(1)&255)<<16|(f.charCodeAt(2)&255)<<8|f.charCodeAt(3)&255}for(;80>d;d++)f=c[d-3]^c[d-8]^c[d-14]^c[d-16],c[d]=f<<1|f>>>31;var f=b[0],g=b[1],k=
b[2],h=b[3],l=b[4],n;for(d=0;80>d;d++)n=20>d?(g&k|~g&h)+1518500249:40>d?(g^k^h)+1859775393:60>d?(g&k|g&h|k&h)+2400959708:(g^k^h)+3395469782,n+=(f<<5|f>>>27)+l+c[d],l=h,h=k,k=g<<30|g>>>2,g=f,f=n;b[0]=b[0]+f|0;b[1]=b[1]+g|0;b[2]=b[2]+k|0;b[3]=b[3]+h|0;b[4]=b[4]+l|0}return b}function De(a){a=Ce(a);for(var b=[],c=0;c<a.length;c++){var d=a[c];b.push(d>>>24&255,d>>>16&255,d>>>8&255,d&255)}return b}
function Ee(a){a=Ce(a);for(var b=new Ba,c=0;c<a.length;c++)b.append(Be(a[c]));a=b.toString();b=new Ba;for(c=0;c<a.length;c++)b.append((a.charCodeAt(c)|256).toString(16).substr(1));return b.toString()};var Fe=null,Ge=null;function M(a){if(!Fe)throw Error("E_TASK_NO_CONTEXT");Fe.name||(Fe.name=a);var b=Fe;a=new He(b,b.top,a);b.top=a;a.b=Ie;return a}function N(a){return new Je(a)}function Ke(a,b,c){a=M(a);a.g=c;try{b(a)}catch(d){Le(a.d,d,a)}return O(a)}function Me(a){var b=Ne,c;Fe?c=Fe.d:(c=Ge)||(c=new Oe(new Pe));b(c,a,void 0)}function Qe(a,b){var c=b.frameTrace;c?w(a+":\n"+c):w(a+":\n"+b.toString())}var Ie=1;function Pe(){}Pe.prototype.currentTime=function(){return(new Date).valueOf()};
function Re(a,b){return setTimeout(a,b)}Pe.prototype.log=function(a){window.console&&window.console.log&&window.console.log(a)};function Oe(a){this.e=a;this.f=1;this.slice=25;this.h=0;this.d=new ka;this.b=this.j=null;this.g=!1;this.N=0;Ge||(Ge=this)}
function Se(a){if(!a.g){var b=a.d.b[1].b,c=a.e.currentTime();if(null!=a.b){if(c+a.f>a.j)return;clearTimeout(a.b)}b-=c;b<=a.f&&(b=a.f);a.j=c+b;a.b=Re(function(){a.b=null;null!=a.b&&(clearTimeout(a.b),a.b=null);a.g=!0;try{var b=a.e.currentTime();for(a.h=b+a.slice;a.d.length();){var c=a.d.b[1];if(c.b>b)break;var f=a.d,g=f.b.pop(),k=f.b.length;if(1<k){for(var h=1;;){var l=2*h;if(l>=k)break;if(0<Te(f.b[l],g))l+1<k&&0<Te(f.b[l+1],f.b[l])&&l++;else if(l+1<k&&0<Te(f.b[l+1],g))l++;else break;f.b[h]=f.b[l];
h=l}f.b[h]=g}var h=c,n=h.d;h.d=null;n&&n.e==h&&(n.e=null,l=Fe,Fe=n,Q(n.top,h.e),Fe=l);b=a.e.currentTime();if(b>=a.h)break}}catch(p){}a.g=!1;a.d.length()&&Se(a)},b)}}Oe.prototype.Va=function(a,b){var c=this.e.currentTime();a.N=this.N++;a.b=c+(b||0);a:{for(var c=this.d,d=c.b.length;1<d;){var e=Math.floor(d/2),f=c.b[e];if(0<Te(f,a)){c.b[d]=a;break a}c.b[d]=f;d=e}c.b[1]=a}Se(this)};
function Ne(a,b,c){var d=new Ue(a,c||"");d.top=new He(d,null,"bootstrap");d.top.b=Ie;d.top.then(function(){function a(){d.h=!1;for(var b=0;b<d.g.length;b++){var c=d.g[b];try{c()}catch(e){}}}try{b().then(function(b){d.f=b;a()})}catch(c){Le(d,c),a()}});c=Fe;Fe=d;a.Va(Ve(d.top,"bootstrap"));Fe=c;return d}function We(a){this.d=a;this.N=this.b=0;this.e=null}function Te(a,b){return b.b-a.b||b.N-a.N}We.prototype.Va=function(a,b){this.e=a;this.d.d.Va(this,b)};
function Ue(a,b){this.d=a;this.name=b;this.g=[];this.b=null;this.h=!0;this.e=this.top=this.j=this.f=null}function Xe(a,b){a.g.push(b)}Ue.prototype.join=function(){var a=M("Task.join");if(this.h){var b=Ve(a,this),c=this;Xe(this,function(){b.Va(c.f)})}else Q(a,this.f);return O(a)};
function Le(a,b,c){var d=b.frameTrace;if(!d){for(var d=b.stack?b.stack+"\n\t---- async ---\n":"",e=a.top;e;e=e.parent)d+="\t",d+=e.name,d+="\n";b.frameTrace=d}if(c){for(d=a.top;d&&d!=c;)d=d.parent;d==c&&(a.top=d)}for(a.b=b;a.top&&!a.top.g;)a.top=a.top.parent;a.top?(b=a.b,a.b=null,a.top.g(a.top,b)):a.b&&Qe("Unhandled exception in task "+a.name,a.b)}function Je(a){this.value=a}m=Je.prototype;m.then=function(a){a(this.value)};m.kc=function(a){return a(this.value)};m.fd=function(a){return new Je(a)};
m.pa=function(a){Q(a,this.value)};m.za=function(){return!1};m.Wb=function(){return this.value};function Ye(a){this.b=a}m=Ye.prototype;m.then=function(a){this.b.then(a)};m.kc=function(a){if(this.za()){var b=new He(this.b.d,this.b.parent,"AsyncResult.thenAsync");b.b=Ie;this.b.parent=b;this.b.then(function(c){a(c).then(function(a){Q(b,a)})});return O(b)}return a(this.b.e)};m.fd=function(a){return this.za()?this.kc(function(){return new Je(a)}):new Je(a)};
m.pa=function(a){this.za()?this.then(function(b){Q(a,b)}):Q(a,this.b.e)};m.za=function(){return this.b.b==Ie};m.Wb=function(){if(this.za())throw Error("Result is pending");return this.b.e};function He(a,b,c){this.d=a;this.parent=b;this.name=c;this.e=null;this.b=0;this.g=this.f=null}function Ze(a){if(!Fe)throw Error("F_TASK_NO_CONTEXT");if(a!==Fe.top)throw Error("F_TASK_NOT_TOP_FRAME");}function O(a){return new Ye(a)}
function Q(a,b){Ze(a);Fe.b||(a.e=b);a.b=2;var c=a.parent;Fe.top=c;if(a.f){try{a.f(b)}catch(d){Le(a.d,d,c)}a.b=3}}He.prototype.then=function(a){switch(this.b){case Ie:if(this.f)throw Error("F_TASK_FRAME_ALREADY_HAS_CALLBACK");this.f=a;break;case 2:var b=this.d,c=this.parent;try{a(this.e),this.b=3}catch(d){this.b=3,Le(b,d,c)}break;case 3:throw Error("F_TASK_DEAD_FRAME");default:throw Error("F_TASK_UNEXPECTED_FRAME_STATE "+this.b);}};
function $e(){var a=M("Frame.timeSlice"),b=a.d.d;b.e.currentTime()>=b.h?(w("-- time slice --"),Ve(a).Va(!0)):Q(a,!0);return O(a)}function af(a){function b(d){try{for(;d;){var e=a();if(e.za()){e.then(b);return}e.then(function(a){d=a})}Q(c,!0)}catch(f){Le(c.d,f,c)}}var c=M("Frame.loop");b(!0);return O(c)}function bf(a){var b=Fe;if(!b)throw Error("E_TASK_NO_CONTEXT");return af(function(){var c;do c=new cf(b,b.top),b.top=c,c.b=Ie,a(c),c=O(c);while(!c.za()&&c.Wb());return c})}
function Ve(a,b){Ze(a);if(a.d.e)throw Error("E_TASK_ALREADY_SUSPENDED");var c=new We(a.d);a.d.e=c;Fe=null;a.d.j=b||null;return c}function cf(a,b){He.call(this,a,b,"loop")}t(cf,He);function df(a){Q(a,!0)}function R(a){Q(a,!1)};function ef(a,b,c,d,e){var f=M("ajax"),g=new XMLHttpRequest,k=Ve(f,g),h={status:0,url:a,contentType:null,responseText:null,responseXML:null,bc:null};g.open(c||"GET",a,!0);b&&(g.responseType=b);g.onreadystatechange=function(){if(4===g.readyState){h.status=g.status;if(200==h.status||0==h.status)if(b&&"document"!==b||!g.responseXML){var c=g.response;b&&"text"!==b||"string"!=typeof c?c?"string"==typeof c?h.bc=ff([c]):h.bc=c:w("Unexpected empty success response for "+a):h.responseText=c;if(c=g.getResponseHeader("Content-Type"))h.contentType=
c.replace(/(.*);.*$/,"$1")}else h.responseXML=g.responseXML,h.contentType=g.responseXML.contentType;k.Va(h)}};d?(g.setRequestHeader("Content-Type",e||"text/plain; charset=UTF-8"),g.send(d)):g.send(null);return O(f)}function ff(a){var b=window.WebKitBlobBuilder||window.MSBlobBuilder;if(b){for(var b=new b,c=0;c<a.length;c++)b.append(a[c]);return b.getBlob("application/octet-stream")}return new Blob(a,{type:"application/octet-stream"})}
function gf(a){var b=M("readBlob"),c=new FileReader,d=Ve(b,c);c.addEventListener("load",function(){d.Va(c.result)},!1);c.readAsArrayBuffer(a);return O(b)}function hf(a,b){this.I=a;this.type=b;this.g={};this.e={}}hf.prototype.load=function(a){a=da(a);var b=this.g[a];return"undefined"!=typeof b?N(b):jf(this.Yb(a))};function kf(a,b){var c=M("fetch");ef(b,a.type).then(function(d){a.I(d,a).then(function(d){delete a.e[b];a.g[b]=d;Q(c,d)})});return O(c)}
hf.prototype.Yb=function(a){a=da(a);if(this.g[a])return null;var b=this.e[a];if(!b){var c=this,b=new lf(function(){return kf(c,a)},"Fetch "+a);c.e[a]=b;b.start()}return b};function mf(a){a=a.responseText;return N(a?JSON.parse(a):null)};function nf(a){var b=parseInt(a,16);if(isNaN(b))throw Error("E_CSS_COLOR");if(6==a.length)return new fd(b);if(3==a.length)return new fd(b&15|(b&15)<<4|(b&240)<<4|(b&240)<<8|(b&3840)<<8|(b&3840)<<12);throw Error("E_CSS_COLOR");}function of(a){this.e=a;this.Ua="Author"}m=of.prototype;m.Db=function(){return null};m.V=function(){return this.e};m.Q=function(){};m.wb=function(a){this.Ua=a};m.$a=function(){};m.vc=function(){};m.Hb=function(){};m.Ib=function(){};m.Bc=function(){};m.Xb=function(){};m.bb=function(){};
m.uc=function(){};m.sc=function(){};m.yc=function(){};m.Hc=function(){};m.gb=function(){};m.fc=function(){};m.Kb=function(){};m.jc=function(){};m.dc=function(){};m.ic=function(){};m.vb=function(){};m.Oc=function(){};m.mb=function(){};m.ec=function(){};m.hc=function(){};m.gc=function(){};m.Mb=function(){};m.Lb=function(){};m.ma=function(){};m.Ka=function(){};m.Ta=function(){};function pf(a){switch(a.Ua){case "UA":return 0;case "User":return 100663296;default:return 83886080}}
function qf(a){switch(a.Ua){case "UA":return 0;case "User":return 16777216;default:return 33554432}}function rf(){of.call(this,null);this.d=[];this.b=null}t(rf,of);function sf(a,b){a.d.push(a.b);a.b=b}m=rf.prototype;m.Db=function(){return null};m.V=function(){return this.b.V()};m.Q=function(a,b){this.b.Q(a,b)};m.wb=function(a){of.prototype.wb.call(this,a);0<this.d.length&&(this.b=this.d[0],this.d=[]);this.b.wb(a)};m.$a=function(a,b){this.b.$a(a,b)};m.vc=function(a){this.b.vc(a)};
m.Hb=function(a,b){this.b.Hb(a,b)};m.Ib=function(a,b){this.b.Ib(a,b)};m.Bc=function(a){this.b.Bc(a)};m.Xb=function(a,b,c,d){this.b.Xb(a,b,c,d)};m.bb=function(){this.b.bb()};m.uc=function(){this.b.uc()};m.sc=function(){this.b.sc()};m.yc=function(){this.b.yc()};m.Hc=function(){this.b.Hc()};m.gb=function(){this.b.gb()};m.fc=function(){this.b.fc()};m.Kb=function(a){this.b.Kb(a)};m.jc=function(){this.b.jc()};m.dc=function(){this.b.dc()};m.ic=function(){this.b.ic()};m.vb=function(){this.b.vb()};m.Oc=function(a){this.b.Oc(a)};
m.mb=function(a){this.b.mb(a)};m.ec=function(a){this.b.ec(a)};m.hc=function(){this.b.hc()};m.gc=function(a,b,c){this.b.gc(a,b,c)};m.Mb=function(a,b,c){this.b.Mb(a,b,c)};m.Lb=function(a,b,c){this.b.Lb(a,b,c)};m.ma=function(){this.b.ma()};m.Ka=function(a,b,c){this.b.Ka(a,b,c)};m.Ta=function(){this.b.Ta()};function tf(a,b,c){of.call(this,a);this.I=c;this.D=0;this.Z=b}t(tf,of);tf.prototype.Db=function(){return this.Z.Db()};tf.prototype.Q=function(a){w(a)};tf.prototype.ma=function(){this.D++};
tf.prototype.Ta=function(){if(0==--this.D&&!this.I){var a=this.Z;a.b=a.d.pop()}};function uf(a,b,c){tf.call(this,a,b,c)}t(uf,tf);function vf(a,b){a.Q(b,a.Db())}function wf(a,b){vf(a,b);sf(a.Z,new tf(a.e,a.Z,!1))}m=uf.prototype;m.gb=function(){wf(this,"E_CSS_UNEXPECTED_SELECTOR")};m.fc=function(){wf(this,"E_CSS_UNEXPECTED_FONT_FACE")};m.Kb=function(){wf(this,"E_CSS_UNEXPECTED_FOOTNOTE")};m.jc=function(){wf(this,"E_CSS_UNEXPECTED_VIEWPORT")};m.dc=function(){wf(this,"E_CSS_UNEXPECTED_DEFINE")};
m.ic=function(){wf(this,"E_CSS_UNEXPECTED_REGION")};m.vb=function(){wf(this,"E_CSS_UNEXPECTED_PAGE")};m.mb=function(){wf(this,"E_CSS_UNEXPECTED_WHEN")};m.ec=function(){wf(this,"E_CSS_UNEXPECTED_FLOW")};m.hc=function(){wf(this,"E_CSS_UNEXPECTED_PAGE_TEMPLATE")};m.gc=function(){wf(this,"E_CSS_UNEXPECTED_PAGE_MASTER")};m.Mb=function(){wf(this,"E_CSS_UNEXPECTED_PARTITION")};m.Lb=function(){wf(this,"E_CSS_UNEXPECTED_PARTITION_GROUP")};m.Ka=function(){this.Q("E_CSS_UNEXPECTED_PROPERTY",this.Db())};
var xf=[],yf=[],S=[],zf=[],Af=[],Bf=[],Cf=[],T=[],Df=[],Ef=[],Ff=[],Gf=[];xf[1]=28;xf[36]=29;xf[7]=29;xf[9]=29;xf[14]=29;xf[18]=29;xf[20]=30;xf[13]=27;xf[0]=200;yf[1]=46;yf[0]=200;Af[1]=2;Af[36]=4;Af[7]=6;Af[9]=8;Af[14]=10;Af[18]=14;S[37]=11;S[23]=12;S[35]=56;S[1]=1;S[36]=3;S[7]=5;S[9]=7;S[14]=9;S[12]=13;S[18]=55;S[50]=42;S[16]=41;zf[1]=2;zf[36]=4;zf[7]=6;zf[9]=8;zf[18]=14;zf[50]=42;zf[14]=10;zf[12]=13;Bf[1]=15;Bf[7]=16;Bf[4]=17;Bf[5]=18;Bf[3]=19;Bf[2]=20;Bf[8]=21;Bf[16]=22;Bf[19]=23;Bf[6]=24;
Bf[11]=25;Bf[17]=26;Bf[13]=48;Bf[31]=47;Bf[23]=54;Bf[0]=44;Cf[1]=31;Cf[4]=32;Cf[5]=32;Cf[3]=33;Cf[2]=34;Cf[10]=40;Cf[6]=38;Cf[31]=36;Cf[24]=36;Cf[32]=35;T[1]=45;T[16]=37;T[37]=37;T[38]=37;T[47]=37;T[48]=37;T[39]=37;T[49]=37;T[26]=37;T[25]=37;T[23]=37;T[24]=37;T[19]=37;T[21]=37;T[36]=37;T[18]=37;T[22]=37;T[11]=39;T[12]=43;T[17]=49;Df[0]=200;Df[12]=50;Df[13]=51;Df[14]=50;Df[15]=51;Df[10]=50;Df[11]=51;Df[17]=53;Ef[0]=200;Ef[12]=50;Ef[13]=52;Ef[14]=50;Ef[15]=51;Ef[10]=50;Ef[11]=51;Ef[17]=53;Ff[0]=200;
Ff[12]=50;Ff[13]=51;Ff[14]=50;Ff[15]=51;Ff[10]=50;Ff[11]=51;Gf[11]=0;Gf[16]=0;Gf[22]=1;Gf[18]=1;Gf[26]=2;Gf[25]=2;Gf[38]=3;Gf[37]=3;Gf[48]=3;Gf[47]=3;Gf[39]=3;Gf[49]=3;Gf[41]=3;Gf[23]=4;Gf[24]=4;Gf[36]=5;Gf[19]=5;Gf[21]=5;Gf[0]=6;Gf[52]=2;function Hf(a,b,c,d){this.b=a;this.A=b;this.h=c;this.ga=d;this.l=[];this.I={};this.d=this.B=null;this.k=!1;this.f=2;this.u=null;this.w=!1;this.j=this.D=null;this.g=[];this.e=[];this.M=this.aa=!1}
function If(a,b){for(var c=[],d=a.l;;){c.push(d[b++]);if(b==d.length)break;if(","!=d[b++])throw Error("Unexpected state");}return c}
function Jf(a,b,c){var d=a.l,e=d.length,f;do f=d[--e];while("undefined"!=typeof f&&"string"!=typeof f);var g=d.length-(e+1);1<g&&d.splice(e+1,g,new Vc(d.slice(e+1,d.length)));if(","==b)return null;e++;do f=d[--e];while("undefined"!=typeof f&&("string"!=typeof f||","==f));g=d.length-(e+1);if("("==f){if(")"!=b)return a.h.Q("E_CSS_MISMATCHED_C_PAR",c),a.b=Ef,null;a=new Xc(d[e-1],If(a,e+1));d.splice(e-1,g+2,a);return null}return";"!=b||0<=e?(a.h.Q("E_CSS_UNEXPECTED_VAL_END",c),a.b=Ef,null):1<g?new Wc(If(a,
e+1)):d[0]}function Kf(a,b,c){a.b=a.d?Ef:Df;a.h.Q(b,c)}
function Lf(a,b,c){for(var d=a.l,e=a.h,f=d.pop(),g;;){var k=d.pop();if(11==b){for(g=[f];16==k;)g.unshift(d.pop()),k=d.pop();if("string"==typeof k){if("{"==k){for(;2<=g.length;)a=g.shift(),c=g.shift(),a=new wc(e.V(),a,c),g.unshift(a);d.push(new L(g[0]));return!0}if("("==k){b=d.pop();f=d.pop();f=new Lc(e.V(),Yb(f,b),g);b=0;continue}}if(10==k){f.Zc()&&(f=new Nc(e.V(),f,null));b=0;continue}}else if("string"==typeof k){d.push(k);break}if(0>k)if(-31==k)f=new rc(e.V(),f);else if(-24==k)f=new sc(e.V(),f);
else return Kf(a,"F_UNEXPECTED_STATE",c),!1;else{if(Gf[b]>Gf[k]){d.push(k);break}g=d.pop();switch(k){case 26:f=new tc(e.V(),g,f);break;case 52:f=new uc(e.V(),g,f);break;case 25:f=new vc(e.V(),g,f);break;case 38:f=new xc(e.V(),g,f);break;case 37:f=new zc(e.V(),g,f);break;case 48:f=new yc(e.V(),g,f);break;case 47:f=new Ac(e.V(),g,f);break;case 39:case 49:f=new Bc(e.V(),g,f);break;case 41:f=new Cc(e.V(),g,f);break;case 23:f=new Dc(e.V(),g,f);break;case 24:f=new Ec(e.V(),g,f);break;case 36:f=new Fc(e.V(),
g,f);break;case 19:f=new Gc(e.V(),g,f);break;case 21:f=new Hc(e.V(),g,f);break;case 18:if(1<d.length)switch(d[d.length-1]){case 22:d.pop();f=new Mc(e.V(),d.pop(),g,f);break;case 10:if(g.Zc())f=new Nc(e.V(),g,f);else return Kf(a,"E_CSS_MEDIA_TEST",c),!1}else return Kf(a,"E_CSS_EXPR_COND",c),!1;break;case 22:if(18!=b)return Kf(a,"E_CSS_EXPR_COND",c),!1;case 10:return d.push(g),d.push(k),d.push(f),!1;default:return Kf(a,"F_UNEXPECTED_STATE",c),!1}}}d.push(f);return!1}
function Mf(a){for(var b=[];;){var c=x(a.A);switch(c.type){case 1:b.push(c.text);break;case 23:b.push("+");break;case 4:case 5:b.push(c.C);break;default:return b}A(a.A)}}
function Nf(a,b,c){a=a.h.V();if(!a)return null;c=c||a.g;if(b){b=b.split(/\s+/);for(var d=0;d<b.length;d++)switch(b[d]){case "vertical":c=Pc(a,c,new rc(a,new Jc(a,"pref-horizontal")));break;case "horizontal":c=Pc(a,c,new Jc(a,"pref-horizontal"));break;case "day":c=Pc(a,c,new rc(a,new Jc(a,"pref-night-mode")));break;case "night":c=Pc(a,c,new Jc(a,"pref-night-mode"));break;default:c=a.f}}return c===a.g?null:new L(c)}
function Of(a){switch(a.e[a.e.length-1]){case "[selector]":case "font-face":case "-epubx-flow":case "-epubx-viewport":case "-epubx-define":case "-adapt-footnote-area":return!0}return!1}
function Pf(a,b,c,d,e){var f=a.h,g=a.A,k=a.l,h,l,n,p;e&&(a.f=2,a.l.push("{"));for(;0<b;--b)switch(h=x(g),a.b[h.type]){case 28:if(18!=z(g,1).type){Of(a)?(f.Q("E_CSS_COLON_EXPECTED",z(g,1)),a.b=Ef):(a.b=Af,f.gb());continue}l=z(g,2);if(!(l.b||1!=l.type&&6!=l.type)){if(0<=g.b)throw Error("F_CSSTOK_BAD_CALL mark");g.b=g.d}a.d=h.text;a.k=!1;A(g);A(g);a.b=Bf;k.splice(0,k.length);continue;case 46:if(18!=z(g,1).type){a.b=Ef;f.Q("E_CSS_COLON_EXPECTED",z(g,1));continue}a.d=h.text;a.k=!1;A(g);A(g);a.b=Bf;k.splice(0,
k.length);continue;case 29:a.b=Af;f.gb();continue;case 1:if(!h.b){a.b=Ff;f.Q("E_CSS_SPACE_EXPECTED",h);continue}f.bb();case 2:if(34==z(g,1).type)if(A(g),A(g),n=a.I[h.text],null!=n)switch(h=x(g),h.type){case 1:f.$a(n,h.text);a.b=S;A(g);break;case 36:f.$a(n,null);a.b=S;A(g);break;default:a.b=Df,f.Q("E_CSS_NAMESPACE",h)}else a.b=Df,f.Q("E_CSS_UNDECLARED_PREFIX",h);else f.$a(a.B,h.text),a.b=S,A(g);continue;case 3:if(!h.b){a.b=Ff;f.Q("E_CSS_SPACE_EXPECTED",h);continue}f.bb();case 4:if(34==z(g,1).type)switch(A(g),
A(g),h=x(g),h.type){case 1:f.$a(null,h.text);a.b=S;A(g);break;case 36:f.$a(null,null);a.b=S;A(g);break;default:a.b=Df,f.Q("E_CSS_NAMESPACE",h)}else f.$a(a.B,null),a.b=S,A(g);continue;case 5:h.b&&f.bb();case 6:f.Bc(h.text);a.b=S;A(g);continue;case 7:h.b&&f.bb();case 8:f.vc(h.text);a.b=S;A(g);continue;case 55:h.b&&f.bb();case 14:A(g);h=x(g);switch(h.type){case 1:f.Hb(h.text,null);A(g);a.b=S;continue;case 6:if(l=h.text,A(g),n=Mf(a),h=x(g),11==h.type){f.Hb(l,n);A(g);a.b=S;continue}}f.Q("E_CSS_PSEUDOCLASS_SYNTAX",
h);a.b=Df;continue;case 42:A(g);h=x(g);switch(h.type){case 1:f.Ib(h.text,null);a.b=S;A(g);continue;case 6:if(l=h.text,A(g),n=Mf(a),h=x(g),11==h.type){f.Ib(l,n);a.b=S;A(g);continue}}f.Q("E_CSS_PSEUDOELEM_SYNTAX",h);a.b=Df;continue;case 9:h.b&&f.bb();case 10:A(g);h=x(g);if(1==h.type)l=h.text,A(g);else if(36==h.type)l=null,A(g);else if(34==h.type)l="";else{a.b=Ff;f.Q("E_CSS_ATTR",h);A(g);continue}h=x(g);if(34==h.type){n=l?a.I[l]:l;if(null==n){a.b=Ff;f.Q("E_CSS_UNDECLARED_PREFIX",h);A(g);continue}A(g);
h=x(g);if(1!=h.type){a.b=Ff;f.Q("E_CSS_ATTR_NAME_EXPECTED",h);continue}l=h.text;A(g);h=x(g)}else n="";switch(h.type){case 39:case 45:case 44:case 46:case 50:p=h.type;A(g);h=x(g);break;case 15:f.Xb(n,l,0,null);a.b=S;A(g);continue;default:a.b=Ff;f.Q("E_CSS_ATTR_OP_EXPECTED",h);continue}switch(h.type){case 1:case 2:f.Xb(n,l,p,h.text);A(g);h=x(g);break;default:a.b=Ff;f.Q("E_CSS_ATTR_VAL_EXPECTED",h);continue}if(15!=h.type){a.b=Ff;f.Q("E_CSS_ATTR",h);continue}a.b=S;A(g);continue;case 11:f.uc();a.b=zf;
A(g);continue;case 12:f.sc();a.b=zf;A(g);continue;case 56:f.yc();a.b=zf;A(g);continue;case 13:a.aa?(a.e.push("-epubx-region"),a.aa=!1):a.M?(a.e.push("page"),a.M=!1):a.e.push("[selector]");f.ma();a.b=xf;A(g);continue;case 41:f.Hc();a.b=Af;A(g);continue;case 15:k.push(J(h.text));A(g);continue;case 16:try{k.push(nf(h.text))}catch(q){f.Q("E_CSS_COLOR",h),a.b=Df}A(g);continue;case 17:k.push(new dd(h.C));A(g);continue;case 18:k.push(new ed(h.C));A(g);continue;case 19:k.push(new K(h.C,h.text));A(g);continue;
case 20:k.push(new bd(h.text));A(g);continue;case 21:k.push(new gd(fa(h.text,a.ga)));A(g);continue;case 22:Jf(a,",",h);k.push(",");A(g);continue;case 23:k.push(ad);A(g);continue;case 24:l=h.text.toLowerCase();"-epubx-expr"==l?(a.b=Cf,a.f=0,k.push("{")):(k.push(l),k.push("("));A(g);continue;case 25:Jf(a,")",h);A(g);continue;case 47:A(g);h=x(g);l=z(g,1);if(1==h.type&&"important"==h.text.toLowerCase()&&(17==l.type||0==l.type||13==l.type)){A(g);a.k=!0;continue}Kf(a,"E_CSS_SYNTAX",h);continue;case 54:l=
z(g,1);switch(l.type){case 4:case 3:case 5:if(!l.b){A(g);continue}}Kf(a,"E_CSS_UNEXPECTED_PLUS",h);continue;case 26:A(g);case 48:g.b=-1;(l=Jf(a,";",h))&&a.d&&f.Ka(a.d,l,a.k);a.b=d?yf:xf;continue;case 44:A(g);g.b=-1;l=Jf(a,";",h);if(c)return a.u=l,!0;a.d&&l&&f.Ka(a.d,l,a.k);if(d)return!0;Kf(a,"E_CSS_SYNTAX",h);continue;case 31:l=z(g,1);9==l.type?(10!=z(g,2).type||z(g,2).b?(k.push(new Jc(f.V(),Yb(h.text,l.text))),a.b=T):(k.push(h.text,l.text,"("),A(g)),A(g)):(2==a.f||3==a.f?"not"==h.text.toLowerCase()?
(A(g),k.push(new Kc(f.V(),!0,l.text))):("only"==h.text.toLowerCase()&&(A(g),h=l),k.push(new Kc(f.V(),!1,h.text))):k.push(new Jc(f.V(),h.text)),a.b=T);A(g);continue;case 38:k.push(null,h.text,"(");A(g);continue;case 32:k.push(new B(f.V(),h.C));A(g);a.b=T;continue;case 33:l=h.text;"%"==l&&(l=a.d&&a.d.match(/height|^(top|bottom)$/)?"vh":"vw");k.push(new Ic(f.V(),h.C,l));A(g);a.b=T;continue;case 34:k.push(new B(f.V(),h.text));A(g);a.b=T;continue;case 35:A(g);h=x(g);5!=h.type||h.b?Kf(a,"E_CSS_SYNTAX",
h):(k.push(new Oc(f.V(),h.C)),A(g),a.b=T);continue;case 36:k.push(-h.type);A(g);continue;case 37:a.b=Cf;Lf(a,h.type,h);k.push(h.type);A(g);continue;case 45:"and"==h.text.toLowerCase()?(a.b=Cf,Lf(a,52,h),k.push(52),A(g)):Kf(a,"E_CSS_SYNTAX",h);continue;case 39:Lf(a,h.type,h)&&(a.d?a.b=Bf:Kf(a,"E_CSS_UNBALANCED_PAR",h));A(g);continue;case 43:Lf(a,11,h)&&(a.d||3==a.f?Kf(a,"E_CSS_UNEXPECTED_BRC",h):(1==a.f?f.mb(k.pop()):(h=k.pop(),f.mb(h)),a.e.push("media"),f.ma(),a.b=xf));A(g);continue;case 49:if(Lf(a,
11,h))if(a.d||3!=a.f)Kf(a,"E_CSS_UNEXPECTED_SEMICOL",h);else return a.j=k.pop(),a.w=!0,a.b=xf,A(g),!1;A(g);continue;case 40:k.push(h.type);A(g);continue;case 27:a.b=xf;A(g);f.Ta();a.e.length&&a.e.pop();continue;case 30:l=h.text.toLowerCase();switch(l){case "import":A(g);h=x(g);if(2==h.type||8==h.type){a.D=h.text;A(g);h=x(g);if(17==h.type||0==h.type)return a.w=!0,A(g),!1;a.d=null;a.f=3;a.b=Cf;k.push("{");continue}f.Q("E_CSS_IMPORT_SYNTAX",h);a.b=Df;continue;case "namespace":A(g);h=x(g);switch(h.type){case 1:l=
h.text;A(g);h=x(g);if((2==h.type||8==h.type)&&17==z(g,1).type){a.I[l]=h.text;A(g);A(g);continue}break;case 2:case 8:if(17==z(g,1).type){a.B=h.text;A(g);A(g);continue}}f.Q("E_CSS_NAMESPACE_SYNTAX",h);a.b=Df;continue;case "charset":A(g);h=x(g);if(2==h.type&&17==z(g,1).type){l=h.text.toLowerCase();"utf-8"!=l&&"utf-16"!=l&&f.Q("E_CSS_UNEXPECTED_CHARSET "+l,h);A(g);A(g);continue}f.Q("E_CSS_CHARSET_SYNTAX",h);a.b=Df;continue;case "font-face":case "-epubx-page-template":case "-epubx-define":case "-epubx-viewport":if(12==
z(g,1).type){A(g);A(g);switch(l){case "font-face":f.fc();break;case "-epubx-page-template":f.hc();break;case "-epubx-define":f.dc();break;case "-epubx-viewport":f.jc()}a.e.push(l);f.ma();continue}break;case "-adapt-footnote-area":A(g);h=x(g);switch(h.type){case 12:A(g);f.Kb(null);a.e.push(l);f.ma();continue;case 50:if(A(g),h=x(g),1==h.type&&12==z(g,1).type){l=h.text;A(g);A(g);f.Kb(l);a.e.push("-adapt-footnote-area");f.ma();continue}}break;case "-epubx-region":A(g);f.ic();a.aa=!0;a.b=Af;continue;case "page":A(g);
f.vb();a.M=!0;a.b=zf;continue;case "top-left-corner":case "top-left":case "top-center":case "top-right":case "top-right-corner":case "right-top":case "right-middle":case "right-bottom":case "bottom-right-corner":case "bottom-right":case "bottom-center":case "bottom-left":case "bottom-left-corner":case "left-bottom":case "left-middle":case "left-top":A(g);h=x(g);if(12==h.type){A(g);f.Oc(l);a.e.push(l);f.ma();continue}break;case "-epubx-when":A(g);a.d=null;a.f=1;a.b=Cf;k.push("{");continue;case "media":A(g);
a.d=null;a.f=2;a.b=Cf;k.push("{");continue;case "-epubx-flow":if(1==z(g,1).type&&12==z(g,2).type){f.ec(z(g,1).text);A(g);A(g);A(g);a.e.push(l);f.ma();continue}break;case "-epubx-page-master":case "-epubx-partition":case "-epubx-partition-group":A(g);h=x(g);p=n=null;var r=[];1==h.type&&(n=h.text,A(g),h=x(g));18==h.type&&1==z(g,1).type&&(p=z(g,1).text,A(g),A(g),h=x(g));for(;6==h.type&&"class"==h.text.toLowerCase()&&1==z(g,1).type&&11==z(g,2).type;)r.push(z(g,1).text),A(g),A(g),A(g),h=x(g);if(12==h.type){A(g);
switch(l){case "-epubx-page-master":f.gc(n,p,r);break;case "-epubx-partition":f.Mb(n,p,r);break;case "-epubx-partition-group":f.Lb(n,p,r)}a.e.push(l);f.ma();continue}break;case "":f.Q("E_CSS_UNEXPECTED_AT"+l,h);a.b=Ff;continue;default:f.Q("E_CSS_AT_UNKNOWN "+l,h);a.b=Df;continue}f.Q("E_CSS_AT_SYNTAX "+l,h);a.b=Df;continue;case 50:if(c||d)return!0;a.g.push(h.type+1);A(g);continue;case 52:if(c||d)return!0;if(0==a.g.length){a.b=xf;continue}case 51:0<a.g.length&&a.g[a.g.length-1]==h.type&&a.g.pop();0==
a.g.length&&13==h.type&&(a.b=xf);A(g);continue;case 53:if(c||d)return!0;0==a.g.length&&(a.b=xf);A(g);continue;case 200:return!0;default:if(c||d)return!0;if(e)return Lf(a,11,h)?(a.u=k.pop(),!0):!1;if(a.b===Bf&&0<=g.b){h=g;if(0>h.b)throw Error("F_CSSTOK_BAD_CALL reset");h.d=h.b;h.b=-1;a.b=Af;f.gb();continue}if(a.b!==Df&&a.b!==Ff&&a.b!==Ef){51==h.type?f.Q(h.text,h):f.Q("E_CSS_SYNTAX",h);a.b=Of(a)?Ef:Ff;continue}A(g)}return!1}function Qf(a){of.call(this,null);this.e=a}t(Qf,of);
Qf.prototype.Q=function(a){throw Error(a);};Qf.prototype.V=function(){return this.e};
function Rf(a,b,c,d,e){var f=M("parseStylesheet"),g=new Hf(xf,a,b,c),k=null;e&&(k=Sf(new Pb(e),b,c));if(k=Nf(g,d,k&&k.fa()))b.mb(k),b.ma();af(function(){for(;!Pf(g,100,!1,!1,!1);){if(g.w){var a=fa(g.D,c);g.j&&(b.mb(g.j),b.ma());var d=M("parseStylesheet.import");Tf(a,b,null,null).then(function(){g.j&&b.Ta();g.w=!1;g.D=null;g.j=null;Q(d,!0)});return O(d)}a=$e();if(a.za)return a}return N(!1)}).then(function(){k&&b.Ta();Q(f,!0)});return O(f)}
function Tf(a,b,c,d){return Ke("parseStylesheetFromURL",function(e){ef(a).then(function(f){f.responseText?(f=new Pb(f.responseText),Rf(f,b,a,c,d).pa(e)):Q(e,!0)})},function(b,c){Qe("Exception while parsing: "+a,c);Q(b,!0)})}function Uf(a,b){var c=new Hf(Bf,b,new Qf(a),"");Pf(c,Number.POSITIVE_INFINITY,!0,!1,!1);return c.u}function Sf(a,b,c){a=new Hf(Cf,a,b,c);Pf(a,Number.POSITIVE_INFINITY,!1,!1,!0);return a.u}
var Vf={"z-index":!0,"column-count":!0,"flow-linger":!0,opacity:!0,page:!0,"flow-priority":!0,utilization:!0};function Wf(a,b,c){if(b.Yc())a:{b=b.d;a=b.evaluate(a);switch(typeof a){case "number":c=Vf[c]?a==Math.round(a)?new ed(a):new dd(a):new K(a,"px");break a;case "string":c=a?Uf(b.b,new Pb(a)):H;break a;case "boolean":c=a?Vd:td;break a;case "undefined":c=H;break a}throw Error("E_UNEXPECTED");}else c=b;return c};function Xf(){this.b={}}t(Xf,Tc);Xf.prototype.hb=function(a){this.b[a.name]=!0;return a};Xf.prototype.Xa=function(a){this.ib(a.values);return a};function Yf(a){this.value=a}t(Yf,Tc);Yf.prototype.yb=function(a){this.value=a.C;return a};function Zf(a,b){if(a){var c=new Yf(b);try{return a.S(c),c.value}catch(d){w("toInt: "+d)}}return b}function $f(){this.d=!1;this.b=[];this.name=null}t($f,Tc);$f.prototype.Ab=function(a){this.d&&this.b.push(a);return null};
$f.prototype.zb=function(a){this.d&&0==a.C&&this.b.push(new K(0,"px"));return null};$f.prototype.Xa=function(a){this.ib(a.values);return null};$f.prototype.ob=function(a){this.d||(this.d=!0,this.ib(a.values),this.d=!1,this.name=a.name.toLowerCase());return null};
function ag(a,b,c,d,e,f){if(a){var g=new $f;try{a.S(g);var k;a:{if(0<g.b.length){a=[];for(var h=0;h<g.b.length;h++){var l=g.b[h];if("%"==l.ja){var n=0==h%2?d:e;3==h&&"circle"==g.name&&(n=Math.sqrt((d*d+e*e)/2));a.push(l.C*n/100)}else a.push(l.C*hc(f,l.ja,!1))}switch(g.name){case "polygon":if(0==a.length%2){f=[];for(g=0;g<a.length;g+=2)f.push({x:b+a[g],y:c+a[g+1]});k=new ie(f);break a}break;case "rectangle":if(4==a.length){k=me(b+a[0],c+a[1],b+a[0]+a[2],c+a[1]+a[3]);break a}break;case "ellipse":if(4==
a.length){k=le(b+a[0],c+a[1],a[2],a[3]);break a}break;case "circle":if(3==a.length){k=le(b+a[0],c+a[1],a[2],a[2]);break a}}}k=null}return k}catch(p){w("toShape: "+p)}}return me(b,c,b+d,c+e)}function bg(a){this.d=a;this.b={};this.name=null}t(bg,Tc);bg.prototype.hb=function(a){this.name=a.toString();this.b[this.name]=this.d?0:(this.b[this.name]||0)+1;return a};bg.prototype.yb=function(a){this.name&&(this.b[this.name]+=a.C-(this.d?0:1));return a};bg.prototype.Xa=function(a){this.ib(a.values);return a};
function cg(a,b){var c=new bg(b);try{a.S(c)}catch(d){w("toCounters: "+d)}return c.b};function lf(a,b){this.Yb=a;this.name=b;this.d=!1;this.b=this.f=null;this.e=[]}lf.prototype.start=function(){if(!this.b){var a=this;this.b=Ne(Fe.d,function(){var b=M("Fetcher.run");a.Yb().then(function(c){var d=a.e;a.d=!0;a.f=c;a.b=null;a.e=[];if(d)for(var e=0;e<d.length;e++)try{d[e](c)}catch(f){w("Error: "+f)}Q(b,c)});return O(b)},this.name)}};function dg(a,b){a.d?b(a.f):a.e.push(b)}function jf(a){if(a.d)return N(a.f);a.start();return a.b.join()}
function eg(a){if(0==a.length)return N(!0);if(1==a.length)return jf(a[0]).fd(!0);var b=M("waitForFetches"),c=0;af(function(){for(;c<a.length;){var b=a[c++];if(!b.d)return jf(b).fd(!0)}return N(!1)}).then(function(){Q(b,!0)});return O(b)}
function fg(a,b){var c=null,d=null;"img"==a.localName&&(c=a.getAttribute("width"),d=a.getAttribute("height"));var e=new lf(function(){function e(b){"img"==a.localName&&(c||a.removeAttribute("width"),d||a.removeAttribute("height"));k.Va(b?b.type:"timeout")}var g=M("loadImage"),k=Ve(g,a);a.addEventListener("load",e,!1);a.addEventListener("error",e,!1);a.addEventListener("abort",e,!1);"http://www.w3.org/2000/svg"==a.namespaceURI?(a.setAttributeNS("http://www.w3.org/1999/xlink","xlink:href",b),setTimeout(e,
300)):a.src=b;return O(g)},"loadElement "+b);e.start();return e};function gg(a){this.f=this.e=null;this.b=0;this.d=a}function hg(a,b){this.b=-1;this.d=a;this.e=b}function ig(){this.b=[];this.d=[];this.match=[];this.e=[];this.f=[];this.g=!0}function jg(a,b,c){for(var d=0;d<b.length;d++)a.d[b[d]].b=c;b.splice(0,b.length)}
ig.prototype.clone=function(){for(var a=new ig,b=0;b<this.b.length;b++){var c=this.b[b],d=new gg(c.d);d.b=c.b;a.b.push(d)}for(b=0;b<this.d.length;b++)c=this.d[b],d=new hg(c.d,c.e),d.b=c.b,a.d.push(d);a.match.push.apply(a.match,this.match);a.e.push.apply(a.e,this.e);a.f.push.apply(a.f,this.f);return a};function kg(a,b,c,d){var e=a.b.length,f=new gg(lg);f.b=0<=d?c?2*d+1:2*d+2:c?-1:-2;a.b.push(f);jg(a,b,e);c=new hg(e,!0);e=new hg(e,!1);b.push(a.d.length);a.d.push(e);b.push(a.d.length);a.d.push(c)}
function mg(a){return 1==a.b.length&&0==a.b[0].b&&a.b[0].d instanceof ng}
function og(a,b,c){if(0!=b.b.length){var d=a.b.length;if(4==c&&1==d&&mg(b)&&mg(a)){c=a.b[0].d;b=b.b[0].d;var d={},e={},f;for(f in c.d)d[f]=c.d[f];for(f in b.d)d[f]=b.d[f];for(var g in c.e)e[g]=c.e[g];for(g in b.e)e[g]=b.e[g];a.b[0].d=new ng(c.b|b.b,d,e)}else{for(f=0;f<b.b.length;f++)a.b.push(b.b[f]);4==c?(a.g=!0,jg(a,a.e,d)):jg(a,a.match,d);g=a.d.length;for(f=0;f<b.d.length;f++)e=b.d[f],e.d+=d,0<=e.b&&(e.b+=d),a.d.push(e);for(f=0;f<b.match.length;f++)a.match.push(b.match[f]+g);3==c&&jg(a,a.match,
d);if(2==c||3==c)for(f=0;f<b.e.length;f++)a.match.push(b.e[f]+g);else if(a.g){for(f=0;f<b.e.length;f++)a.e.push(b.e[f]+g);a.g=b.g}else for(f=0;f<b.e.length;f++)a.f.push(b.e[f]+g);for(f=0;f<b.f.length;f++)a.f.push(b.f[f]+g);b.b=null;b.d=null}}}var U={};function pg(){}t(pg,Tc);pg.prototype.f=function(a,b){var c=a[b].S(this);return c?[c]:null};function ng(a,b,c){this.b=a;this.d=b;this.e=c}t(ng,pg);m=ng.prototype;m.Pc=function(a){return this.b&1?a:null};m.Qc=function(a){return this.b&2048?a:null};
m.Ob=function(a){return this.b&2?a:null};m.hb=function(a){var b=this.d[a.name.toLowerCase()];return b?b:this.b&4?a:null};m.Ab=function(a){return 0!=a.C||this.b&512?0>a.C&&!(this.b&256)?null:this.e[a.ja]?a:null:"%"==a.ja&&this.b&1024?a:null};m.zb=function(a){return 0==a.C?this.b&512?a:null:0>=a.C&&!(this.b&256)?null:this.b&16?a:null};m.yb=function(a){return 0==a.C?this.b&512?a:null:0>=a.C&&!(this.b&256)?null:this.b&48?a:(a=this.d[""+a.C])?a:null};m.mc=function(a){return this.b&64?a:null};
m.Pb=function(a){return this.b&128?a:null};m.Xa=function(){return null};m.nb=function(){return null};m.ob=function(){return null};m.xb=function(){return null};var lg=new ng(0,U,U);
function qg(a){this.b=new gg(null);var b=this.e=new gg(null),c=a.b.length;a.b.push(this.b);a.b.push(b);jg(a,a.match,c);jg(a,a.e,c+1);jg(a,a.f,c+1);for(b=0;b<a.d.length;b++){var d=a.d[b];d.e?a.b[d.d].e=a.b[d.b]:a.b[d.d].f=a.b[d.b]}for(b=0;b<c;b++)if(null==a.b[b].f||null==a.b[b].e)throw Error("Invalid validator state");this.d=a.b[0]}t(qg,pg);
function rg(a,b,c,d){for(var e=c?[]:b,f=a.d,g=d,k=null,h=null;f!==a.b&&f!==a.e;)if(g>=b.length)f=f.f;else{var l=b[g],n=l;if(0!=f.b)n=!0,-1==f.b?(k?k.push(h):k=[h],h=[]):-2==f.b?0<k.length?h=k.pop():h=null:0<f.b&&0==f.b%2?h[Math.floor((f.b-1)/2)]="taken":n=null==h[Math.floor((f.b-1)/2)],f=n?f.e:f.f;else{if(0==g&&!c&&f.d instanceof sg&&a instanceof tg){if(n=(new Vc(b)).S(f.d)){g=b.length;f=f.e;continue}}else n=l.S(f.d);if(n){if(n!==l&&b===e)for(e=[],l=0;l<g;l++)e[l]=b[l];b!==e&&(e[g-d]=n);g++;f=f.e}else f=
f.f}}return f===a.b&&(c?0<e.length:g==b.length)?e:null}m=qg.prototype;m.Oa=function(a){for(var b=null,c=this.d;c!==this.b&&c!==this.e;)a?0!=c.b?c=c.e:(b=a.S(c.d))?(a=null,c=c.e):c=c.f:c=c.f;return c===this.b?b:null};m.Pc=function(a){return this.Oa(a)};m.Qc=function(a){return this.Oa(a)};m.Ob=function(a){return this.Oa(a)};m.hb=function(a){return this.Oa(a)};m.Ab=function(a){return this.Oa(a)};m.zb=function(a){return this.Oa(a)};m.yb=function(a){return this.Oa(a)};m.mc=function(a){return this.Oa(a)};
m.Pb=function(a){return this.Oa(a)};m.Xa=function(){return null};m.nb=function(){return null};m.ob=function(a){return this.Oa(a)};m.xb=function(){return null};function tg(a){qg.call(this,a)}t(tg,qg);tg.prototype.Xa=function(a){var b=rg(this,a.values,!1,0);return b===a.values?a:b?new Vc(b):null};tg.prototype.f=function(a,b){return rg(this,a,!0,b)};function sg(a){qg.call(this,a)}t(sg,qg);sg.prototype.Xa=function(a){return this.Oa(a)};
sg.prototype.nb=function(a){var b=rg(this,a.values,!1,0);return b===a.values?a:b?new Wc(b):null};function ug(a,b){qg.call(this,b);this.name=a}t(ug,qg);ug.prototype.Oa=function(){return null};ug.prototype.ob=function(a){if(a.name.toLowerCase()!=this.name)return null;var b=rg(this,a.values,!1,0);return b===a.values?a:b?new Xc(a.name,b):null};function vg(){}vg.prototype.b=function(a,b){return b};vg.prototype.e=function(){};
function wg(a,b,c){this.name=b;this.d=a.e[this.name];c&&this.d instanceof sg&&(this.d=this.d.d.d)}t(wg,vg);wg.prototype.b=function(a,b,c){if(c.values[this.name])return b;if(a=this.d.f(a,b)){var d=a.length;this.e(1<d?new Vc(a):a[0],c);return b+d}return b};wg.prototype.e=function(a,b){b.values[this.name]=a};function xg(a,b){wg.call(this,a,b[0],!1);this.f=b}t(xg,wg);xg.prototype.e=function(a,b){for(var c=0;c<this.f.length;c++)b.values[this.f[c]]=a};function yg(a,b){this.d=a;this.dd=b}t(yg,vg);
yg.prototype.b=function(a,b,c){var d=b;if(this.dd)if(a[b]==ad){if(++b==a.length)return d}else return d;var e=this.d[0].b(a,b,c);if(e==b)return d;b=e;for(d=1;d<this.d.length&&b<a.length;d++){e=this.d[d].b(a,b,c);if(e==b)break;b=e}return b};function zg(){this.d=this.Ma=null;this.b=!1;this.values={};this.e=null}m=zg.prototype;m.ud=function(a){return new wg(this.e,a,!1)};m.clone=function(){var a=new this.constructor;a.Ma=this.Ma;a.d=this.d;a.e=this.e;return a};m.Uc=function(a,b){this.Ma=a;this.d=b};
m.pb=function(){this.b=!0;return 0};function Ag(a,b){a.pb([b]);return null}m.Pc=function(a){return Ag(this,a)};m.Ob=function(a){return Ag(this,a)};m.hb=function(a){return Ag(this,a)};m.Ab=function(a){return Ag(this,a)};m.zb=function(a){return Ag(this,a)};m.yb=function(a){return Ag(this,a)};m.mc=function(a){return Ag(this,a)};m.Pb=function(a){return Ag(this,a)};m.Xa=function(a){this.pb(a.values);return null};m.nb=function(){this.b=!0;return null};m.ob=function(a){return Ag(this,a)};
m.xb=function(){this.b=!0;return null};function Bg(){zg.call(this)}t(Bg,zg);Bg.prototype.pb=function(a){for(var b=0,c=0;b<a.length;){var d=this.Ma[c].b(a,b,this);if(d>b)b=d,c=0;else if(++c==this.Ma.length){this.b=!0;break}}return b};function Cg(){zg.call(this)}t(Cg,zg);Cg.prototype.pb=function(a){if(a.length>this.Ma.length||0==a.length)return this.b=!0,0;for(var b=0;b<this.Ma.length;b++){for(var c=b;c>=a.length;)c=1==c?0:c-2;if(this.Ma[b].b(a,c,this)!=c+1)return this.b=!0,0}return a.length};
function Dg(){zg.call(this)}t(Dg,zg);Dg.prototype.pb=function(a){for(var b=a.length,c=0;c<a.length;c++)if(a[c]===ad){b=c;break}if(b>this.Ma.length||0==a.length)return this.b=!0,0;for(c=0;c<this.Ma.length;c++){for(var d=c;d>=b;)d=1==d?0:d-2;var e;if(b+1<a.length)for(e=b+c+1;e>=a.length;)e-=e==b+2?1:2;else e=d;if(2!=this.Ma[c].b([a[d],a[e]],0,this))return this.b=!0,0}return a.length};function Eg(){zg.call(this)}t(Eg,Bg);Eg.prototype.ud=function(a){return new wg(this.e,a,!0)};
Eg.prototype.nb=function(a){for(var b={},c=0;c<a.values.length;c++){this.values={};a.values[c].S(this);for(var d=b,e=this.values,f=0;f<this.d.length;f++){var g=this.d[f],k=e[g]||this.e.h[g],h=d[g];h||(h=[],d[g]=h);h.push(k)}this.values["background-color"]&&c!=a.values.length-1&&(this.b=!0);if(this.b)return null}this.values={};for(var l in b)this.values[l]="background-color"==l?b[l].pop():new Wc(b[l]);return null};function Fg(){zg.call(this)}t(Fg,Bg);
Fg.prototype.Uc=function(a,b){Bg.prototype.Uc.call(this,a,b);this.d.push("font-family","line-height","font-size")};
Fg.prototype.pb=function(a){var b=Bg.prototype.pb.call(this,a);if(b+2>a.length)return this.b=!0,b;this.b=!1;var c=this.e.e;if(!a[b].S(c["font-size"]))return this.b=!0,b;this.values["font-size"]=a[b++];if(a[b]===ad){b++;if(b+2>a.length||!a[b].S(c["line-height"]))return this.b=!0,b;this.values["line-height"]=a[b++]}var d=b==a.length-1?a[b]:new Vc(a.slice(b,a.length));if(!d.S(c["font-family"]))return this.b=!0,b;this.values["font-family"]=d;return a.length};
Fg.prototype.nb=function(a){a.values[0].S(this);if(this.b)return null;for(var b=[this.values["font-family"]],c=1;c<a.values.length;c++)b.push(a.values[c]);a=new Wc(b);a.S(this.e.e["font-family"])?this.values["font-family"]=a:this.b=!0;return null};Fg.prototype.hb=function(a){if(a=this.e.d[a.name])for(var b in a)this.values[b]=a[b];else this.b=!0;return null};var Gg={SIMPLE:Bg,INSETS:Cg,INSETS_SLASH:Dg,COMMA:Eg,FONT:Fg};
function Hg(){this.e={};this.k={};this.h={};this.b={};this.d={};this.f={};this.j=[];this.g=[]}function Ig(a,b){var c;if(3==b.type)c=new K(b.C,b.text);else if(7==b.type)c=nf(b.text);else if(1==b.type)c=J(b.text);else throw Error("unexpected replacement");if(mg(a)){var d=a.b[0].d.d,e;for(e in d)d[e]=c;return a}throw Error("unexpected replacement");}
function Jg(a,b,c){for(var d=new ig,e=0;e<b;e++)og(d,a.clone(),1);if(c==Number.POSITIVE_INFINITY)og(d,a,3);else for(e=b;e<c;e++)og(d,a.clone(),2);return d}function Kg(a){var b=new ig,c=b.b.length;b.b.push(new gg(a));a=new hg(c,!0);var d=new hg(c,!1);jg(b,b.match,c);b.g?(b.e.push(b.d.length),b.g=!1):b.f.push(b.d.length);b.d.push(d);b.match.push(b.d.length);b.d.push(a);return b}
function Lg(a,b){var c;switch(a){case "COMMA":c=new sg(b);break;case "SPACE":c=new tg(b);break;default:c=new ug(a.toLowerCase(),b)}return Kg(c)}
function Mg(a){a.b.HASHCOLOR=Kg(new ng(64,U,U));a.b.POS_INT=Kg(new ng(32,U,U));a.b.POS_NUM=Kg(new ng(16,U,U));a.b.POS_PERCENTAGE=Kg(new ng(8,U,{"%":H}));a.b.NEGATIVE=Kg(new ng(256,U,U));a.b.ZERO=Kg(new ng(512,U,U));a.b.ZERO_PERCENTAGE=Kg(new ng(1024,U,U));a.b.POS_LENGTH=Kg(new ng(8,U,{em:H,ex:H,ch:H,rem:H,vh:H,vw:H,vmin:H,vmax:H,cm:H,mm:H,"in":H,px:H,pt:H,pc:H}));a.b.POS_ANGLE=Kg(new ng(8,U,{deg:H,grad:H,rad:H,turn:H}));a.b.POS_TIME=Kg(new ng(8,U,{s:H,ms:H}));a.b.FREQUENCY=Kg(new ng(8,U,{Hz:H,kHz:H}));
a.b.RESOLUTION=Kg(new ng(8,U,{dpi:H,dpcm:H,dppx:H}));a.b.URI=Kg(new ng(128,U,U));a.b.IDENT=Kg(new ng(4,U,U));a.b.STRING=Kg(new ng(2,U,U));var b={"font-family":J("sans-serif")};a.d.caption=b;a.d.icon=b;a.d.menu=b;a.d["message-box"]=b;a.d["small-caption"]=b;a.d["status-bar"]=b}function Ng(a){return!!a.match(/^[A-Z_0-9]+$/)}
function Og(a,b,c){var d=x(b);if(0==d.type)return null;var e={"":!0};if(14==d.type){do{A(b);d=x(b);if(1!=d.type)throw Error("Prefix name expected");e[d.text]=!0;A(b);d=x(b)}while(16==d.type);if(15!=d.type)throw Error("']' expected");A(b);d=x(b)}if(1!=d.type)throw Error("Property name expected");if(2==c?"SHORTHANDS"==d.text:"DEFAULTS"==d.text)return A(b),null;d=d.text;A(b);if(2!=c){if(39!=x(b).type)throw Error("'=' expected");Ng(d)||(a.k[d]=e)}else if(18!=x(b).type)throw Error("':' expected");return d}
function Pg(a,b){for(;;){var c=Og(a,b,1);if(!c)break;for(var d=[],e=[],f="",g,k=!0,h=function(){if(0==d.length)throw Error("No values");var a;if(1==d.length)a=d[0];else{var b=f,c=d;a=new ig;if("||"==b){for(b=0;b<c.length;b++){var e=new ig,g=e;if(g.b.length)throw Error("invalid call");var k=new gg(lg);k.b=2*b+1;g.b.push(k);var k=new hg(0,!0),h=new hg(0,!1);g.e.push(g.d.length);g.d.push(h);g.match.push(g.d.length);g.d.push(k);og(e,c[b],1);kg(e,e.match,!1,b);og(a,e,0==b?1:4)}c=new ig;if(c.b.length)throw Error("invalid call");
kg(c,c.match,!0,-1);og(c,a,3);a=[c.match,c.e,c.f];for(b=0;b<a.length;b++)kg(c,a[b],!1,-1);a=c}else{switch(b){case " ":e=1;break;case "|":case "||":e=4;break;default:throw Error("unexpected op");}for(b=0;b<c.length;b++)og(a,c[b],0==b?1:e)}}return a},l=function(a){if(k)throw Error("'"+a+"': unexpected");if(f&&f!=a)throw Error("mixed operators: '"+a+"' and '"+f+"'");f=a;k=!0},n=null;!n;)switch(A(b),g=x(b),g.type){case 1:k||l(" ");if(Ng(g.text)){var p=a.b[g.text];if(!p)throw Error("'"+g.text+"' unexpected");
d.push(p.clone())}else p={},p[g.text]=J(g.text),d.push(Kg(new ng(0,p,U)));k=!1;break;case 5:p={};p[""+g.C]=new ed(g.C);d.push(Kg(new ng(0,p,U)));k=!1;break;case 34:l("|");break;case 25:l("||");break;case 14:k||l(" ");e.push({gd:d,cd:f,tc:"["});f="";d=[];k=!0;break;case 6:k||l(" ");e.push({gd:d,cd:f,tc:"(",sb:g.text});f="";d=[];k=!0;break;case 15:g=h();p=e.pop();if("["!=p.tc)throw Error("']' unexpected");d=p.gd;d.push(g);f=p.cd;k=!1;break;case 11:g=h();p=e.pop();if("("!=p.tc)throw Error("')' unexpected");
d=p.gd;d.push(Lg(p.sb,g));f=p.cd;k=!1;break;case 18:if(k)throw Error("':' unexpected");A(b);d.push(Ig(d.pop(),x(b)));break;case 22:if(k)throw Error("'?' unexpected");d.push(Jg(d.pop(),0,1));break;case 36:if(k)throw Error("'*' unexpected");d.push(Jg(d.pop(),0,Number.POSITIVE_INFINITY));break;case 23:if(k)throw Error("'+' unexpected");d.push(Jg(d.pop(),1,Number.POSITIVE_INFINITY));break;case 12:A(b);g=x(b);if(5!=g.type)throw Error("<int> expected");var q=p=g.C;A(b);g=x(b);if(16==g.type){A(b);g=x(b);
if(5!=g.type)throw Error("<int> expected");q=g.C;A(b);g=x(b)}if(13!=g.type)throw Error("'}' expected");d.push(Jg(d.pop(),p,q));break;case 17:n=h();if(0<e.length)throw Error("unclosed '"+e.pop().tc+"'");break;default:throw Error("unexpected token");}A(b);Ng(c)?a.b[c]=n:a.e[c]=1!=n.b.length||0!=n.b[0].b?new tg(n):n.b[0].d}}
function Qg(a,b){for(var c={},d=0;d<b.length;d++)for(var e=b[d],f=a.f[e],e=f?f.d:[e],f=0;f<e.length;f++){var g=e[f],k=a.h[g];k?c[g]=k:w("Unknown property in makePropSet: "+g)}return c}
function Rg(a,b,c,d,e){var f="",g=b;b=b.toLowerCase();var k=b.match(/^-([a-z]+)-([-a-z0-9]+)$/);k&&(f=k[1],b=k[2]);if((k=a.k[b])&&k[f])if(f=a.e[b])(a=c===xd||c.Yc()?c:c.S(f))?e.fb(b,a,d):e.Eb(g,c);else if(b=a.f[b].clone(),c===xd)for(c=0;c<b.d.length;c++)e.fb(b.d[c],xd,d);else{c.S(b);if(b.b)d=!1;else{for(a=0;a<b.d.length;a++)f=b.d[a],e.fb(f,b.values[f]||b.e.h[f],d);d=!0}d||e.Eb(g,c)}else e.lc(g,c)}
var Sg=new lf(function(){var a=M("loadValidatorSet.load"),b=fa("validation.txt",ea),c=ef(b),d=new Hg;Mg(d);c.then(function(c){try{if(c.responseText){var f=new Pb(c.responseText);for(Pg(d,f);;){var g=Og(d,f,2);if(!g)break;for(c=[];;){A(f);var k=x(f);if(17==k.type){A(f);break}switch(k.type){case 1:c.push(J(k.text));break;case 4:c.push(new dd(k.C));break;case 5:c.push(new ed(k.C));break;case 3:c.push(new K(k.C,k.text));break;default:throw Error("unexpected token");}}d.h[g]=1<c.length?new Vc(c):c[0]}for(;;){var h=
Og(d,f,3);if(!h)break;var l=z(f,1),n;1==l.type&&Gg[l.text]?(n=new Gg[l.text],A(f)):n=new Bg;n.e=d;g=!1;k=[];c=!1;for(var p=[],q=[];!g;)switch(A(f),l=x(f),l.type){case 1:if(d.e[l.text])k.push(n.ud(l.text)),q.push(l.text);else if(d.f[l.text]instanceof Cg){var r=d.f[l.text];k.push(new xg(r.e,r.d));q.push.apply(q,r.d)}else throw Error("'"+l.text+"' is neither a simple property nor an inset shorthand");break;case 19:if(0<k.length||c)throw Error("unexpected slash");c=!0;break;case 14:p.push({dd:c,Ma:k});
k=[];c=!1;break;case 15:var v=new yg(k,c),y=p.pop(),k=y.Ma;c=y.dd;k.push(v);break;case 17:g=!0;A(f);break;default:throw Error("unexpected token");}n.Uc(k,q);d.f[h]=n}d.g=Qg(d,["background"]);d.j=Qg(d,"margin border padding columns column-gap column-rule column-fill".split(" "))}else w("Error: missing "+b)}catch(I){w("Error: "+I)}Q(a,d)});return O(a)},"validatorFetcher");for(var Tg={azimuth:!0,"border-collapse":!0,"border-spacing":!0,"caption-side":!0,color:!0,cursor:!0,direction:!0,elevation:!0,"empty-cells":!0,"font-kerning":!0,"font-size":!0,"font-family":!0,"font-style":!0,"font-variant":!0,"font-weight":!0,"letter-spacing":!0,"line-break":!0,"line-height":!0,"list-style-image":!0,"list-style-position":!0,"list-style-type":!0,orphans:!0,"overflow-wrap":!0,"pitch-range":!0,quotes:!0,richness:!0,"ruby-align":!0,"ruby-position":!0,"speak-header":!0,"speak-numeral":!0,
"speak-punctuation":!0,"speech-rate":!0,stress:!0,"tab-size":!0,"text-align":!0,"text-align-last":!0,"text-decoration-skip":!0,"text-emphasis-color":!0,"text-emphasis-position":!0,"text-emphasis-style":!0,"text-combine-upright":!0,"text-indent":!0,"text-justify":!0,"text-size-adjust":!0,"text-transform":!0,"text-underline-position":!0,visibility:!0,"voice-family":!0,volume:!0,"white-space":!0,widows:!0,"word-break":!0,"word-spacing":!0,"word-wrap":!0,"writing-mode":!0},Ug={"http://www.idpf.org/2007/ops":!0,
"http://www.w3.org/1999/xhtml":!0,"http://www.w3.org/2000/svg":!0},Vg="margin-% padding-% border-%-width border-%-style border-%-color %".split(" "),Wg=["left","right","top","bottom"],Xg={width:!0,height:!0},Yg=0;Yg<Vg.length;Yg++)for(var Zg=0;Zg<Wg.length;Zg++){var $g=Vg[Yg].replace("%",Wg[Zg]);Xg[$g]=!0}function ah(a){for(var b={},c=0;c<Vg.length;c++)for(var d in a){var e=Vg[c].replace("%",d),f=Vg[c].replace("%",a[d]);b[e]=f;b[f]=e}return b}
var bh=ah({before:"right",after:"left",start:"top",end:"bottom"}),ch=ah({before:"top",after:"bottom",start:"left",end:"right"});function V(a,b){this.value=a;this.Ea=b}m=V.prototype;m.ld=function(){return this};m.xc=function(a){a=this.value.S(a);return a===this.value?this:new V(a,this.Ea)};m.md=function(a){return 0==a?this:new V(this.value,this.Ea+a)};m.evaluate=function(a,b){return Wf(a,this.value,b)};m.jd=function(){return!0};function dh(a,b,c){V.call(this,a,b);this.J=c}t(dh,V);
dh.prototype.ld=function(){return new V(this.value,this.Ea)};dh.prototype.xc=function(a){a=this.value.S(a);return a===this.value?this:new dh(a,this.Ea,this.J)};dh.prototype.md=function(a){return 0==a?this:new dh(this.value,this.Ea+a,this.J)};dh.prototype.jd=function(a){return!!this.J.evaluate(a)};function eh(a,b,c){return(null==b||c.Ea>b.Ea)&&c.jd(a)?c.ld():b}var fh={"region-id":!0};function gh(a){return"_"!=a.charAt(0)&&!fh[a]}function hh(a,b,c){c?a[b]=c:delete a[b]}
function ih(a,b){var c=a[b];c||(c={},a[b]=c);return c}function jh(a,b){var c=a[b];c||(c=[],a[b]=c);return c}function kh(a,b,c,d,e,f){if(e){var g=ih(b,"_pseudos");b=g[e];b||(b={},g[e]=b)}f&&(e=ih(b,"_regions"),b=e[f],b||(b={},e[f]=b));for(var k in c)"_"!=k.charAt(0)&&(fh[k]?(f=c[k],e=jh(b,k),Array.prototype.push.apply(e,f)):hh(b,k,eh(a,b[k],c[k].md(d))))}function lh(a,b){this.e=a;this.d=b;this.b=""}t(lh,Uc);
function mh(a){a=a.e["font-size"].value;var b;a:switch(a.ja.toLowerCase()){case "px":case "in":case "pt":case "pc":case "cm":case "mm":case "q":b=!0;break a;default:b=!1}if(!b)throw Error("Unexpected state");return a.C*ec[a.ja]}
lh.prototype.Ab=function(a){if("em"==a.ja||"ex"==a.ja){var b=hc(this.d,a.ja,!1)/hc(this.d,"em",!1);return new K(a.C*b*mh(this),"px")}if("%"==a.ja){if("font-size"===this.b)return new K(a.C/100*mh(this),"px");b=this.b.match(/height|^(top|bottom)$/)?"vh":"vw";return new K(a.C,b)}return a};lh.prototype.xb=function(a){return"font-size"==this.b?Wf(this.d,a,this.b).S(this):a};function nh(){}nh.prototype.apply=function(){};nh.prototype.g=function(a){return new oh([this,a])};nh.prototype.clone=function(){return this};
function ph(a){this.b=a}t(ph,nh);ph.prototype.apply=function(a){a.b[a.b.length-1].push(this.b.b())};function oh(a){this.b=a}t(oh,nh);oh.prototype.apply=function(a){for(var b=0;b<this.b.length;b++)this.b[b].apply(a)};oh.prototype.g=function(a){this.b.push(a);return this};oh.prototype.clone=function(){return new oh([].concat(this.b))};function qh(a,b,c,d){this.style=a;this.b=b;this.d=c;this.e=d}t(qh,nh);qh.prototype.apply=function(a){kh(a.d,a.w,this.style,this.b,this.d,this.e)};
function X(){this.b=null}t(X,nh);X.prototype.apply=function(a){this.b.apply(a)};X.prototype.d=function(){return 0};X.prototype.e=function(){return!1};function rh(a){this.b=null;this.f=a}t(rh,X);rh.prototype.apply=function(a){0<=a.u.indexOf(this.f)&&this.b.apply(a)};rh.prototype.d=function(){return 10};rh.prototype.e=function(a){this.b&&sh(a.ya,this.f,this.b);return!0};function th(a){this.b=null;this.id=a}t(th,X);th.prototype.apply=function(a){a.M!=this.id&&a.ga!=this.id||this.b.apply(a)};
th.prototype.d=function(){return 11};th.prototype.e=function(a){this.b&&sh(a.e,this.id,this.b);return!0};function uh(a){this.b=null;this.localName=a}t(uh,X);uh.prototype.apply=function(a){a.f==this.localName&&this.b.apply(a)};uh.prototype.d=function(){return 8};uh.prototype.e=function(a){this.b&&sh(a.Nb,this.localName,this.b);return!0};function vh(a,b){this.b=null;this.f=a;this.localName=b}t(vh,X);vh.prototype.apply=function(a){a.f==this.localName&&a.k==this.f&&this.b.apply(a)};vh.prototype.d=function(){return 8};
vh.prototype.e=function(a){if(this.b){var b=a.b[this.f];b||(b="ns"+a.g++ +":",a.b[this.f]=b);sh(a.f,b+this.localName,this.b)}return!0};function wh(a){this.b=null;this.f=a}t(wh,X);wh.prototype.apply=function(a){var b=a.e;if(b&&"a"==a.f){var c=b.getAttribute("href");c&&c.match(/^#/)&&(b=b.ownerDocument.getElementById(c.substring(1)))&&(b=b.getAttributeNS("http://www.idpf.org/2007/ops","type"))&&b.match(this.f)&&this.b.apply(a)}};function yh(a){this.b=null;this.f=a}t(yh,X);
yh.prototype.apply=function(a){a.k==this.f&&this.b.apply(a)};function zh(a,b){this.b=null;this.f=a;this.name=b}t(zh,X);zh.prototype.apply=function(a){a.e&&a.e.hasAttributeNS(this.f,this.name)&&this.b.apply(a)};function Ah(a,b,c){this.b=null;this.f=a;this.name=b;this.value=c}t(Ah,X);Ah.prototype.apply=function(a){a.e&&a.e.getAttributeNS(this.f,this.name)==this.value&&this.b.apply(a)};Ah.prototype.d=function(){return"type"==this.name&&"http://www.idpf.org/2007/ops"==this.f?9:0};
Ah.prototype.e=function(a){return"type"==this.name&&"http://www.idpf.org/2007/ops"==this.f?(this.b&&sh(a.d,this.value,this.b),!0):!1};function Bh(a,b){this.b=null;this.f=a;this.name=b}t(Bh,X);Bh.prototype.apply=function(a){if(a.e){var b=a.e.getAttributeNS(this.f,this.name);b&&Ug[b]&&this.b.apply(a)}};Bh.prototype.d=function(){return 0};Bh.prototype.e=function(){return!1};function Ch(a,b,c){this.b=null;this.h=a;this.name=b;this.f=c}t(Ch,X);
Ch.prototype.apply=function(a){if(a.e){var b=a.e.getAttributeNS(this.h,this.name);b&&b.match(this.f)&&this.b.apply(a)}};function Dh(a){this.b=null;this.f=a}t(Dh,X);Dh.prototype.apply=function(a){a.lang.match(this.f)&&this.b.apply(a)};function Eh(){this.b=null}t(Eh,X);Eh.prototype.apply=function(a){a.na&&this.b.apply(a)};Eh.prototype.d=function(){return 6};function Fh(){this.b=null}t(Fh,X);Fh.prototype.apply=function(a){a.Fa&&this.b.apply(a)};Fh.prototype.d=function(){return 12};
function Gh(a){this.b=null;this.f=a}t(Gh,X);Gh.prototype.apply=function(a){a.qa===this.f&&this.b.apply(a)};Gh.prototype.d=function(){return 5};function Hh(a){this.b=null;this.J=a}t(Hh,X);Hh.prototype.apply=function(a){a.h[this.J]&&this.b.apply(a)};Hh.prototype.d=function(){return 5};function Ih(a){this.J=a}Ih.prototype.b=function(){return this};Ih.prototype.push=function(a,b){0==b&&Jh(a,this.J);return!1};Ih.prototype.pop=function(a,b){return 0==b?(a.h[this.J]--,!0):!1};function Kh(a){this.J=a}
Kh.prototype.b=function(){return this};Kh.prototype.push=function(a,b){0==b?Jh(a,this.J):1==b&&a.h[this.J]--;return!1};Kh.prototype.pop=function(a,b){if(0==b)return a.h[this.J]--,!0;1==b&&Jh(a,this.J);return!1};function Lh(a){this.J=a;this.d=!1}Lh.prototype.b=function(){return new Lh(this.J)};Lh.prototype.push=function(a){return this.d?(a.h[this.J]--,!0):!1};Lh.prototype.pop=function(a,b){if(this.d)return a.h[this.J]--,!0;0==b&&(this.d=!0,Jh(a,this.J));return!1};
function Mh(a){this.J=a;this.d=!1}Mh.prototype.b=function(){return new Mh(this.J)};Mh.prototype.push=function(a,b){this.d&&(-1==b?Jh(a,this.J):0==b&&a.h[this.J]--);return!1};Mh.prototype.pop=function(a,b){if(this.d){if(-1==b)return a.h[this.J]--,!0;0==b&&Jh(a,this.J)}else 0==b&&(this.d=!0,Jh(a,this.J));return!1};function Nh(a,b){this.e=a;this.d=b}Nh.prototype.b=function(){return this};Nh.prototype.push=function(){return!1};Nh.prototype.pop=function(a,b){return 0==b?(Oh(a,this.e,this.d),!0):!1};
function Ph(a){this.lang=a}Ph.prototype.b=function(){return this};Ph.prototype.push=function(){return!1};Ph.prototype.pop=function(a,b){return 0==b?(a.lang=this.lang,!0):!1};function Qh(a){this.d=a}Qh.prototype.b=function(){return this};Qh.prototype.push=function(){return!1};Qh.prototype.pop=function(a,b){return 0==b?(a.B=this.d,!0):!1};function Rh(a,b){this.b=a;this.d=b}t(Rh,Uc);
Rh.prototype.hb=function(a){var b=this.b,c=b.B,d=Math.floor(c.length/2)-1;switch(a.name){case "open-quote":a=c[2*Math.min(d,b.l)];b.l++;break;case "close-quote":return 0<b.l&&b.l--,c[2*Math.min(d,b.l)+1];case "no-open-quote":return b.l++,new bd("");case "no-close-quote":return 0<b.l&&b.l--,new bd("")}return a};
var Sh={roman:[4999,1E3,"M",900,"CM",500,"D",400,"CD",100,"C",90,"XC",50,"L",40,"XL",10,"X",9,"IX",5,"V",4,"IV",1,"I"],armenian:[9999,9E3,"\u0584",8E3,"\u0583",7E3,"\u0582",6E3,"\u0581",5E3,"\u0580",4E3,"\u057f",3E3,"\u057e",2E3,"\u057d",1E3,"\u057c",900,"\u057b",800,"\u057a",700,"\u0579",600,"\u0578",500,"\u0577",400,"\u0576",300,"\u0575",200,"\u0574",100,"\u0573",90,"\u0572",80,"\u0571",70,"\u0570",60,"\u056f",50,"\u056e",40,"\u056d",30,"\u056c",20,"\u056b",10,"\u056a",9,"\u0569",8,"\u0568",7,"\u0567",
6,"\u0566",5,"\u0565",4,"\u0564",3,"\u0563",2,"\u0562",1,"\u0561"],georgian:[19999,1E4,"\u10f5",9E3,"\u10f0",8E3,"\u10ef",7E3,"\u10f4",6E3,"\u10ee",5E3,"\u10ed",4E3,"\u10ec",3E3,"\u10eb",2E3,"\u10ea",1E3,"\u10e9",900,"\u10e8",800,"\u10e7",700,"\u10e6",600,"\u10e5",500,"\u10e4",400,"\u10f3",300,"\u10e2",200,"\u10e1",100,"\u10e0",90,"\u10df",80,"\u10de",70,"\u10dd",60,"\u10f2",50,"\u10dc",40,"\u10db",30,"\u10da",20,"\u10d9",10,"\u10d8",9,"\u10d7",8,"\u10f1",7,"\u10d6",6,"\u10d5",5,"\u10d4",4,"\u10d3",
3,"\u10d2",2,"\u10d1",1,"\u10d0"],hebrew:[999,400,"\u05ea",300,"\u05e9",200,"\u05e8",100,"\u05e7",90,"\u05e6",80,"\u05e4",70,"\u05e2",60,"\u05e1",50,"\u05e0",40,"\u05de",30,"\u05dc",20,"\u05db",19,"\u05d9\u05d8",18,"\u05d9\u05d7",17,"\u05d9\u05d6",16,"\u05d8\u05d6",15,"\u05d8\u05d5",10,"\u05d9",9,"\u05d8",8,"\u05d7",7,"\u05d6",6,"\u05d5",5,"\u05d4",4,"\u05d3",3,"\u05d2",2,"\u05d1",1,"\u05d0"]},Th={latin:"a-z",alpha:"a-z",greek:"\u03b1-\u03c1\u03c3-\u03c9",russian:"\u0430-\u0438\u043a-\u0449\u044d-\u044f"},
Uh={square:"\u25a0",disc:"\u2022",circle:"\u25e6",none:""},Vh={Zd:!1,Bb:"\u96f6\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d",ac:"\u5341\u767e\u5343",Cd:"\u8ca0"};
function Wh(a){if(9999<a||-9999>a)return""+a;if(0==a)return Vh.Bb.charAt(0);var b=new Ba;0>a&&(b.append(Vh.Cd),a=-a);if(10>a)b.append(Vh.Bb.charAt(a));else if(Vh.$d&&19>=a)b.append(Vh.ac.charAt(0)),0!=a&&b.append(Vh.ac.charAt(a-10));else{var c=Math.floor(a/1E3);c&&(b.append(Vh.Bb.charAt(c)),b.append(Vh.ac.charAt(2)));if(c=Math.floor(a/100)%10)b.append(Vh.Bb.charAt(c)),b.append(Vh.ac.charAt(1));if(c=Math.floor(a/10)%10)b.append(Vh.Bb.charAt(c)),b.append(Vh.ac.charAt(0));(a%=10)&&b.append(Vh.Bb.charAt(a))}return b.toString()}
function Xh(a,b){var c=!1,d=!1,e;null!=(e=b.match(/^upper-(.*)/))?(c=!0,b=e[1]):null!=(e=b.match(/^lower-(.*)/))&&(d=!0,b=e[1]);e="";if(Sh[b])a:{e=Sh[b];var f=a;if(f>e[0]||0>=f||f!=Math.round(f))e="";else{for(var g="",k=1;k<e.length;k+=2){var h=e[k],l=Math.floor(f/h);if(20<l){e="";break a}for(f-=l*h;0<l;)g+=e[k+1],l--}e=g}}else if(Th[b])if(e=a,0>=e||e!=Math.round(e))e="";else{g=Th[b];f=[];for(k=0;k<g.length;)if("-"==g.substr(k+1,1))for(l=g.charCodeAt(k),h=g.charCodeAt(k+2),k+=3;l<=h;l++)f.push(String.fromCharCode(l));
else f.push(g.substr(k++,1));g="";do e--,k=e%f.length,g=f[k]+g,e=(e-k)/f.length;while(0<e);e=g}else null!=Uh[b]?e=Uh[b]:"decimal-leading-zero"==b?(e=a+"",1==e.length&&(e="0"+e)):"cjk-ideographic"==b||"trad-chinese-informal"==b?e=Wh(a):e=a+"";return c?e.toUpperCase():d?e.toLowerCase():e}
function Yh(a,b){var c=b[0].toString(),d=1<b.length?b[1].stringValue():"decimal",e=a.b.g[c];if(e&&e.length)return new bd(Xh(e&&e.length&&e[e.length-1]||0,d));c=new L(Zh(a.b.Ga,c,function(a){return Xh(a||0,d)}));return new Vc([c])}
function $h(a,b){var c=b[0].toString(),d=b[1].stringValue(),e=2<b.length?b[2].stringValue():"decimal",f=a.b.g[c],g=new Ba;if(f&&f.length)for(var k=0;k<f.length;k++)0<k&&g.append(d),g.append(Xh(f[k],e));c=new L(ai(a.b.Ga,c,function(a){var b=[];if(a.length)for(var c=0;c<a.length;c++)b.push(Xh(a[c],e));a=g.toString();a.length&&b.push(a);return b.length?b.join(d):Xh(0,e)}));return new Vc([c])}
Rh.prototype.ob=function(a){switch(a.name){case "attr":if(1==a.values.length)return new bd(this.d&&this.d.getAttribute(a.values[0].stringValue())||"");break;case "counter":if(2>=a.values.length)return Yh(this,a.values);break;case "counters":if(3>=a.values.length)return $h(this,a.values)}w("E_CSS_CONTENT_PROP: "+a.toString());return new bd("")};var bi=1/1048576;function ci(a,b){for(var c in a)b[c]=a[c].clone()}
function di(){this.g=0;this.b={};this.Nb={};this.f={};this.d={};this.ya={};this.e={};this.Gb={};this.N=0}di.prototype.clone=function(){var a=new di;a.g=this.g;for(var b in this.b)a.b[b]=this.b[b];ci(this.Nb,a.Nb);ci(this.f,a.f);ci(this.d,a.d);ci(this.ya,a.ya);ci(this.e,a.e);ci(this.Gb,a.Gb);a.N=this.N;return a};function sh(a,b,c){var d=a[b];d&&(c=d.g(c));a[b]=c}
function ei(a,b,c){this.j=a;this.d=b;this.Ga=c;this.b=[[],[]];this.h={};this.u=this.w=this.e=null;this.aa=this.ga=this.M=this.k=this.f="";this.I=this.D=null;this.Fa=this.na=!0;this.g={};this.A=[{}];this.B=[new bd("\u201c"),new bd("\u201d"),new bd("\u2018"),new bd("\u2019")];this.l=0;this.lang="";this.Ya=[0];this.qa=0;this.wa=[]}function Jh(a,b){a.h[b]=(a.h[b]||0)+1}function fi(a,b,c){(b=b[c])&&b.apply(a)}var gi=[];
function hi(a,b,c,d){a.e=null;a.w=d;a.k="";a.f="";a.M="";a.ga="";a.u=b;a.aa="";a.D=gi;a.I=c;ii(a)}function ji(a,b,c){a.g[b]?a.g[b].push(c):a.g[b]=[c];c=a.A[a.A.length-1];c||(c={},a.A[a.A.length-1]=c);c[b]=!0}
function ki(a,b){var c=yd,d=b.display;d&&(c=d.evaluate(a.d));var e=null,d=null,f=b["counter-reset"];f&&(f=f.evaluate(a.d))&&(e=cg(f,!0));(f=b["counter-increment"])&&(f=f.evaluate(a.d))&&(d=cg(f,!1));"ol"!=a.f&&"ul"!=a.f||"http://www.w3.org/1999/xhtml"!=a.k||(e||(e={}),e["ua-list-item"]=0);c===Dd&&(d||(d={}),d["ua-list-item"]=1);if(e)for(var g in e)ji(a,g,e[g]);if(d)for(var k in d)a.g[k]||ji(a,k,0),g=a.g[k],g[g.length-1]+=d[k];c===Dd&&(c=a.g["ua-list-item"],b["ua-list-item-count"]=new V(new dd(c[c.length-
1]),0));a.A.push(null)}function li(a){var b=a.A.pop();if(b)for(var c in b)(b=a.g[c])&&(1==b.length?delete a.g[c]:b.pop())}function Oh(a,b,c){ki(a,b);b.content&&(b.content=b.content.xc(new Rh(a,c)));li(a)}var mi="before transclusion-before footnote-call footnote-marker inner first-letter first-line  transclusion-after after".split(" ");
function ni(a,b,c){a.wa.push(b);a.I=null;a.e=b;a.w=c;a.k=b.namespaceURI;a.f=b.localName;var d=a.j.b[a.k];a.aa=d?d+a.f:"";a.M=b.getAttribute("id");a.ga=b.getAttributeNS("http://www.w3.org/XML/1998/namespace","id");(d=b.getAttribute("class"))?a.u=d.split(/\s+/):a.u=gi;(d=b.getAttributeNS("http://www.idpf.org/2007/ops","type"))?a.D=d.split(/\s+/):a.D=gi;"style"==a.f&&"http://www.gribuser.ru/xml/fictionbook/2.0"==a.k&&(a.u=[b.getAttribute("name")||""]);(d=b.getAttributeNS("http://www.w3.org/XML/1998/namespace",
"lang"))||"http://www.w3.org/1999/xhtml"!=a.k||(d=b.getAttribute("lang"));d&&(a.b[a.b.length-1].push(new Ph(a.lang)),a.lang=d.toLowerCase());d=a.Ya;a.qa=++d[d.length-1];d.push([0]);ii(a);d=c.quotes;c=null;d&&(d=d.evaluate(a.d))&&(c=new Qh(a.B),d===Fd?a.B=[new bd(""),new bd("")]:d instanceof Vc&&(a.B=d.values));ki(a,a.w);if(d=a.w._pseudos)for(var e=!0,f=0;f<mi.length;f++){var g=mi[f];g||(e=!1);(g=d[g])&&(e?Oh(a,g,b):a.b[a.b.length-2].push(new Nh(g,b)))}c&&a.b[a.b.length-2].push(c)}
function ii(a){var b;for(b=0;b<a.u.length;b++)fi(a,a.j.ya,a.u[b]);for(b=0;b<a.D.length;b++)fi(a,a.j.d,a.D[b]);fi(a,a.j.e,a.M);fi(a,a.j.Nb,a.f);""!=a.f&&fi(a,a.j.Nb,"*");fi(a,a.j.f,a.aa);null!==a.I&&(fi(a,a.j.Gb,a.I),fi(a,a.j.Gb,"*"));a.e=null;a.b.push([]);for(var c=1;-1<=c;--c){var d=a.b[a.b.length-c-2];for(b=0;b<d.length;)d[b].push(a,c)?d.splice(b,1):b++}a.na=!0;a.Fa=!1}
ei.prototype.pop=function(){for(var a=1;-1<=a;--a)for(var b=this.b[this.b.length-a-2],c=0;c<b.length;)b[c].pop(this,a)?b.splice(c,1):c++;this.b.pop();this.na=!1};var oi=null;function pi(a,b,c,d,e,f,g){tf.call(this,a,b,g);this.b=null;this.d=0;this.k=null;this.w=0;this.g=null;this.l=!1;this.J=c;this.h=d?d.h:oi?oi.clone():new di;this.B=e;this.u=f;this.j=0}t(pi,uf);m=pi.prototype;m.nd=function(a){sh(this.h.Nb,"*",a)};
function qi(a,b){var c=a.b;if(0<c.length){c.sort(function(a,b){return b.d()-a.d()});for(var d=null,e=c.length-1;0<=e;e--)d=c[e],d.b=b,b=d;if(d.e(a.h))return}a.nd(b)}m.$a=function(a,b){if(b||a)this.d+=1,b&&a?this.b.push(new vh(a,b)):b?this.b.push(new uh(b)):this.b.push(new yh(a))};m.vc=function(a){this.g?(w("::"+this.g+" followed by ."+a),this.b.push(new Hh(""))):(this.d+=256,this.b.push(new rh(a)))};
m.Hb=function(a,b){if(this.g)w("::"+this.g+" followed by :"+a),this.b.push(new Hh(""));else{switch(a.toLowerCase()){case "first-child":this.b.push(new Eh);break;case "root":this.b.push(new Fh);break;case "link":this.b.push(new uh("a"));this.b.push(new zh("","href"));break;case "-adapt-href-epub-type":case "href-epub-type":if(b&&1==b.length&&"string"==typeof b[0]){var c=new RegExp("(^|s)"+ha(b[0])+"($|s)");this.b.push(new wh(c))}else this.b.push(new Hh(""));break;case "-adapt-footnote-content":case "footnote-content":this.l=
!0;break;case "visited":case "active":case "hover":case "focus":this.b.push(new Hh(""));break;case "lang":b&&1==b.length&&"string"==typeof b[0]?this.b.push(new Dh(new RegExp("^"+ha(b[0].toLowerCase())+"($|-)"))):this.b.push(new Hh(""));break;case "nth-child":b&&1==b.length&&"number"==typeof b[0]?this.b.push(new Gh(b[0])):this.b.push(new Hh(""));break;case "before":case "after":case "first-line":case "first-letter":this.Ib(a,b);return;default:this.b.push(new Hh(""))}this.d+=256}};
m.Ib=function(a,b){switch(a){case "before":case "after":case "first-line":case "first-letter":case "footnote-call":case "footnote-marker":case "inner":this.g?(w("Double pseudoelement ::"+this.g+"::"+a),this.b.push(new Hh(""))):this.g=a;break;case "first-n-lines":if(b&&1==b.length&&"number"==typeof b[0]){var c=Math.round(b[0]);if(0<c&&c==b[0]){this.g?(w("Double pseudoelement ::"+this.g+"::"+a),this.b.push(new Hh(""))):this.g="first-"+c+"-lines";break}}default:w("Unrecognized pseudoelement: ::"+a),
this.b.push(new Hh(""))}this.d+=1};m.Bc=function(a){this.d+=65536;this.b.push(new th(a))};m.Xb=function(a,b,c,d){this.d+=256;d=d||"";switch(c){case 0:this.b.push(new zh(a,b));break;case 39:this.b.push(new Ah(a,b,d));break;case 45:this.b.push(new Ch(a,b,new RegExp("(^|s)"+ha(d)+"($|s)")));break;case 44:this.b.push(new Ch(a,b,new RegExp("^"+ha(d)+"($|-)")));break;case 50:"supported"==d?this.b.push(new Bh(a,b)):w("Unsupported :: attr selector op: "+d);break;default:w("Unsupported attr selector: "+c)}};
m.bb=function(){var a="d"+this.w++;qi(this,new ph(new Ih(a)));this.b=[new Hh(a)]};m.uc=function(){var a="c"+this.w++;qi(this,new ph(new Kh(a)));this.b=[new Hh(a)]};m.sc=function(){var a="a"+this.w++;qi(this,new ph(new Lh(a)));this.b=[new Hh(a)]};m.yc=function(){var a="f"+this.w++;qi(this,new ph(new Mh(a)));this.b=[new Hh(a)]};m.Hc=function(){ri(this);this.g=null;this.l=!1;this.d=0;this.b=[]};
m.gb=function(){var a;0!=this.j?(wf(this,"E_CSS_UNEXPECTED_SELECTOR"),a=!0):a=!1;a||(this.j=1,this.k={},this.g=null,this.d=0,this.l=!1,this.b=[])};m.Q=function(a,b){uf.prototype.Q.call(this,a,b);1==this.j&&(this.j=0)};m.wb=function(a){uf.prototype.wb.call(this,a);this.j=0};m.ma=function(){ri(this);uf.prototype.ma.call(this);1==this.j&&(this.j=0)};m.Ta=function(){uf.prototype.Ta.call(this)};function ri(a){if(a.b){var b=a.d,c;c=a.h;c=c.N+=bi;qi(a,a.pd(b+c));a.b=null;a.g=null;a.l=!1;a.d=0}}
m.pd=function(a){var b=this.B;this.l&&(b=b?"xxx-bogus-xxx":"footnote");return new qh(this.k,a,this.g,b)};m.Ka=function(a,b,c){Rg(this.u,a,b,c,this)};m.Eb=function(a,b){vf(this,"E_INVALID_PROPERTY_VALUE "+a+": "+b.toString())};m.lc=function(a,b){vf(this,"E_INVALID_PROPERTY "+a+": "+b.toString())};m.fb=function(a,b,c){"display"!=a||b!==Id&&b!==Hd||(this.fb("flow-options",new Vc([sd,Md]),c),this.fb("flow-into",b,c),b=nd);c=c?pf(this):qf(this);hh(this.k,a,this.J?new dh(b,c,this.J):new V(b,c))};
function si(a,b){tf.call(this,a,b,!1)}t(si,uf);si.prototype.Ka=function(a,b){if(this.e.values[a])this.Q("E_CSS_NAME_REDEFINED "+a,this.Db());else{var c=a.match(/height|^(top|bottom)$/)?"vh":"vw",c=new Ic(this.e,100,c),c=b.fa(this.e,c);this.e.values[a]=c}};function ti(a,b,c,d,e){tf.call(this,a,b,!1);this.b=d;this.J=c;this.d=e}t(ti,uf);ti.prototype.Ka=function(a,b,c){c?w("E_IMPORTANT_NOT_ALLOWED"):Rg(this.d,a,b,c,this)};ti.prototype.Eb=function(a,b){w("E_INVALID_PROPERTY_VALUE "+a+": "+b.toString())};
ti.prototype.lc=function(a,b){w("E_INVALID_PROPERTY "+a+": "+b.toString())};ti.prototype.fb=function(a,b,c){c=c?pf(this):qf(this);c+=this.N;this.N+=bi;hh(this.b,a,this.J?new dh(b,c,this.J):new V(b,c))};function ui(a,b){Qf.call(this,a);this.b={};this.d=b;this.N=0}t(ui,Qf);ui.prototype.Ka=function(a,b,c){Rg(this.d,a,b,c,this)};ui.prototype.Eb=function(a,b){w("E_INVALID_PROPERTY_VALUE "+a+": "+b.toString())};ui.prototype.lc=function(a,b){w("E_INVALID_PROPERTY "+a+": "+b.toString())};
ui.prototype.fb=function(a,b,c){c=(c?67108864:50331648)+this.N;this.N+=bi;hh(this.b,a,new V(b,c))};var vi=new lf(function(){var a=M("uaStylesheetBase");jf(Sg).then(function(b){var c=fa("user-agent-base.css",ea);b=new pi(null,null,null,null,null,b,!0);b.wb("UA");oi=b.h;Tf(c,b,null,null).pa(a)});return O(a)},"uaStylesheetBaseFetcher");function wi(a,b,c){return(a=a["writing-mode"])&&(b=a.evaluate(b,"writing-mode"))&&b!==xd?b===Td:c}
function xi(a,b,c,d){var e={},f;for(f in a)gh(f)&&(e[f]=a[f]);a=a._regions;if((c||d)&&a)for(d&&(d=["footnote"],c=c?c.concat(d):d),d=0;d<c.length;d++){f=a[c[d]];for(var g in f)gh(g)&&(e[g]=eh(b,e[g],f[g]))}return e}function yi(a,b,c,d){c=c?bh:ch;for(var e in a)if(a.hasOwnProperty(e)){var f=a[e];if(f){var g=c[e];if(g){var k=a[g];if(k&&k.Ea>f.Ea)continue;g=Xg[g]?g:e}else g=e;b[g]=d(e,f)}}};var zi={"font-style":Gd,"font-variant":Gd,"font-weight":Gd},Ai="OTTO"+(new Date).valueOf(),Bi=1;function Ci(a){a=this.lb=a;var b=new Ba,c;for(c in zi)b.append(" "),b.append(a[c].toString());this.d=b.toString();this.src=this.lb.src?this.lb.src.toString():null;this.e=[];this.f=[];this.b=(c=this.lb["font-family"])?c.stringValue():null}
function Di(a,b,c){var d=new Ba;d.append("@font-face {\n  font-family: ");d.append(a.b);d.append(";\n  ");for(var e in zi)d.append(e),d.append(": "),a.lb[e].xa(d,!0),d.append(";\n  ");c?(d.append('src: url("'),b=(window.URL||window.webkitURL).createObjectURL(c),d.append(b),a.e.push(b),a.f.push(c),d.append('")')):(d.append("src: "),d.append(b));d.append(";\n}\n");return d.toString()}function Ei(a){this.d=a;this.b={}}function Fi(a,b){this.d=a;this.b=b;this.e={};this.f=0}
function Gi(a,b,c){b=b.b;var d=c.b[b];if(d)return d;d="Fnt_"+ ++a.f;return c.b[b]=d}
function Hi(a,b,c,d){var e=M("initFont"),f=b.src,g={},k;for(k in zi)g[k]=b.lb[k];d=Gi(a,b,d);g["font-family"]=J(d);var h=new Ci(g),l=a.b.ownerDocument.createElement("span");l.textContent="M";var n=(new Date).valueOf()+1E3;b=a.d.ownerDocument.createElement("style");k=Ai+Bi++;b.textContent=Di(h,"",ff([k]));a.d.appendChild(b);a.b.appendChild(l);l.style.visibility="hidden";l.style.fontFamily=d;for(var p in zi)u(l,p,g[p].toString());var g=l.getBoundingClientRect(),q=g.right-g.left,r=g.bottom-g.top;b.textContent=
Di(h,f,c);w("Starting to load font: "+f);var v=!1;af(function(){var a=l.getBoundingClientRect(),b=a.bottom-a.top;if(q!=a.right-a.left||r!=b)return v=!0,N(!1);(new Date).valueOf()>n?a=N(!1):(a=M("Frame.sleep"),Ve(a).Va(!0,10),a=O(a));return a}).then(function(){v?w("Loaded font: "+f):w("Failed to load font: "+f);a.b.removeChild(l);Q(e,h)});return O(e)}
function Ii(a,b,c){var d=b.src,e=a.e[d];e?dg(e,function(a){if(a.d==b.d){var e=b.b,k=c.b[e];a=a.b;if(k){if(k!=a)throw Error("E_FONT_FAMILY_INCONSISTENT "+b.b);}else c.b[e]=a;w("Found already-loaded font: "+d)}else w("E_FONT_FACE_INCOMPATIBLE "+b.src)}):(e=new lf(function(){var e=M("loadFont"),g=c.d?c.d(d):null;g?ef(d,"blob").then(function(d){d.bc?g(d.bc).then(function(d){Hi(a,b,d,c).pa(e)}):Q(e,null)}):Hi(a,b,null,c).pa(e);return O(e)},"loadFont "+d),a.e[d]=e,e.start());return e};function Ji(a,b,c){this.j=a;this.url=b;this.b=c;this.lang=null;this.f=-1;this.root=c.documentElement;a=null;if("http://www.w3.org/1999/xhtml"==this.root.namespaceURI){for(b=this.root.firstChild;b;b=b.nextSibling)if(1==b.nodeType&&(c=b,"http://www.w3.org/1999/xhtml"==c.namespaceURI))switch(c.localName){case "head":a=c}this.lang=this.root.getAttribute("lang")}else if("http://www.gribuser.ru/xml/fictionbook/2.0"==this.root.namespaceURI){a=this.root;for(b=this.root.firstChild;b;b=b.nextSibling);b=Ki(Ki(Ki(Ki(new Li([this.b]),
"FictionBook"),"description"),"title-info"),"lang").textContent();0<b.length&&(this.lang=b[0])}else if("http://example.com/sse"==this.root.namespaceURI)for(c=this.root.firstElementChild;c;c=c.nextElementSibling)"meta"===c.localName&&(a=c);this.h=a;this.e=this.root;this.g=1;this.e.setAttribute("data-adapt-eloff","0")}
function Mi(a,b){var c=b.getAttribute("data-adapt-eloff");if(c)return parseInt(c,10);for(var c=a.g,d=a.e;d!=b;){var e=d.firstChild;if(!e)for(;!(e=d.nextSibling);)if(d=d.parentNode,null==d)throw Error("Internal error");d=e;1==e.nodeType?(e.setAttribute("data-adapt-eloff",c.toString()),++c):c+=e.textContent.length}a.g=c;a.e=b;return c-1}
function Ni(a,b,c,d){var e=0,f=null;if(1==b.nodeType){if(!d)return Mi(a,b)}else{e=c;f=b.previousSibling;if(!f)return b=b.parentNode,e+=1,Mi(a,b)+e;b=f}for(;;){for(;b.lastChild;)b=b.lastChild;if(1==b.nodeType)break;e+=b.textContent.length;f=b.previousSibling;if(!f){b=b.parentNode;break}b=f}e+=1;return Mi(a,b)+e}function Oi(a){0>a.f&&(a.f=Ni(a,a.root,0,!0));return a.f}
function Pi(a,b){for(var c,d=a.root;;){c=Mi(a,d);if(c>=b)return d;var e=d.children;if(!e)break;var f=Ka(e.length,function(c){return Mi(a,e[c])>b});if(0==f)break;if(f<e.length&&Mi(a,e[f])<=b)throw Error("Consistency check failed!");d=e[f-1]}c=c+1;for(var f=d,g=f.firstChild||f.nextSibling,k=null;;){if(g){if(1==g.nodeType)break;k=f=g;c+=g.textContent.length;if(c>b)break}else if(f=f.parentNode,!f)break;g=f.nextSibling}return k||d}
function Qi(a,b){var c=b.getAttribute("id");c&&!a.d[c]&&(a.d[c]=b);(c=b.getAttributeNS("http://www.w3.org/XML/1998/namespace","id"))&&!a.d[c]&&(a.d[c]=b);for(c=b.firstElementChild;c;c=c.nextElementSibling)Qi(a,c)}function Ri(a,b){var c=b.match(/([^#]*)\#(.+)$/);if(!c||c[1]&&c[1]!=a.url)return null;var c=c[2],d=a.b.getElementById(c);d||(a.d||(a.d={},Qi(a,a.b.documentElement)),d=a.d[c]);return d}var Si={Vd:"text/html",Wd:"text/xml",Od:"application/xml",Nd:"application/xhtml_xml",Qd:"image/svg+xml"};
function Ti(a,b,c){c=c||new DOMParser;var d;try{d=c.parseFromString(a,b)}catch(e){}if(d){a=d.documentElement;if("parsererror"===a.localName)return null;for(a=a.firstChild;a;a=a.nextSibling)if("parsererror"===a.localName)return null}else return null;return d}
function Ui(a){var b=a.contentType;if(b){for(var c=Object.keys(Si),d=0;d<c.length;d++)if(Si[c[d]]===b)return b;if(b.match(/\+xml$/))return"application/xml"}if(a=a.url.match(/\.([^./]+)$/))switch(a[1]){case "html":case "htm":return"text/html";case "xhtml":case "xht":return"application/xhtml_xml";case "svg":case "svgz":return"image/svg+xml";case "opf":case "xml":return"application/xml"}return null}
function Vi(a,b){var c=a.responseXML;if(!c){var d=new DOMParser,e=a.responseText||"<not-found/>",f=Ui(a);(c=Ti(e,f||"application/xml",d))&&!f&&(f=c.documentElement,"html"!==f.localName.toLowerCase()||f.namespaceURI?"svg"===f.localName.toLowerCase()&&"image/svg+xml"!==c.contentType&&(c=Ti(e,"image/svg+xml",d)):c=Ti(e,"text/html",d));c||(c=Ti(e,"text/html",d))||d.parseFromString("<error/>","text/xml")}c=new Ji(b,a.url,c);return N(c)}function Wi(a){this.sb=a}
function Xi(){var a=Yi;return new Wi(function(b){return a.sb(b)&&1==b.nodeType&&"http://www.idpf.org/2008/embedding"==b.getAttribute("Algorithm")})}function Zi(){var a=Xi(),b=Yi;return new Wi(function(c){if(!b.sb(c))return!1;c=new Li([c]);c=Ki(c,"EncryptionMethod");a&&(c=$i(c,a));return 0<c.b.length})}var Yi=new Wi(function(){return!0});function Li(a){this.b=a}function aj(a){return a.b}function $i(a,b){for(var c=[],d=0;d<a.b.length;d++){var e=a.b[d];b.sb(e)&&c.push(e)}return new Li(c)}
function bj(a,b){function c(a){d.push(a)}for(var d=[],e=0;e<a.b.length;e++)b(a.b[e],c);return new Li(d)}function cj(a,b){for(var c=[],d=0;d<a.b.length;d++)c.push(b(a.b[d]));return c}function dj(a,b){for(var c=[],d=0;d<a.b.length;d++){var e=b(a.b[d]);null!=e&&c.push(e)}return c}function Ki(a,b){return bj(a,function(a,d){for(var e=a.firstChild;e;e=e.nextSibling)e.localName==b&&d(e)})}function ej(a){return bj(a,function(a,c){for(var d=a.firstChild;d;d=d.nextSibling)1==d.nodeType&&c(d)})}
function fj(a,b){return dj(a,function(a){return 1==a.nodeType?a.getAttribute(b):null})}Li.prototype.textContent=function(){return cj(this,function(a){return a.textContent})};function gj(a,b,c,d){d=d[b];if(!d)throw Error("unknown writing-mode: "+b);b=d[c||"ltr"];if(!b)throw Error("unknown direction: "+c);for(c=0;c<b.length;c++)if(d=b[c],d=a.replace(d.f,d.b),d!==a)return d;return a}function hj(a){var b=ij,c={};Object.keys(b).forEach(function(d){var e=c[d]={},f=b[d];Object.keys(f).forEach(function(b){e[b]=f[b].map(function(b){return{f:new RegExp("(-?)"+(a?b.G:b.H)+"(-?)"),b:"$1"+(a?b.H:b.G)+"$2"}})})});return c}
var ij={"horizontal-tb":{ltr:[{G:"inline-start",H:"left"},{G:"inline-end",H:"right"},{G:"block-start",H:"top"},{G:"block-end",H:"bottom"},{G:"inline-size",H:"width"},{G:"block-size",H:"height"}],rtl:[{G:"inline-start",H:"right"},{G:"inline-end",H:"left"},{G:"block-start",H:"top"},{G:"block-end",H:"bottom"},{G:"inline-size",H:"width"},{G:"block-size",H:"height"}]},"vertical-rl":{ltr:[{G:"inline-start",H:"top"},{G:"inline-end",H:"bottom"},{G:"block-start",H:"right"},{G:"block-end",H:"left"},{G:"inline-size",
H:"height"},{G:"block-size",H:"width"}],rtl:[{G:"inline-start",H:"bottom"},{G:"inline-end",H:"top"},{G:"block-start",H:"right"},{G:"block-end",H:"left"},{G:"inline-size",H:"height"},{G:"block-size",H:"width"}]},"vertical-lr":{ltr:[{G:"inline-start",H:"top"},{G:"inline-end",H:"bottom"},{G:"block-start",H:"left"},{G:"block-end",H:"right"},{G:"inline-size",H:"height"},{G:"block-size",H:"width"}],rtl:[{G:"inline-start",H:"bottom"},{G:"inline-end",H:"top"},{G:"block-start",H:"left"},{G:"block-end",H:"right"},
{G:"inline-size",H:"height"},{G:"block-size",H:"width"}]}},jj=hj(!0),kj=hj(!1),lj={"horizontal-tb":[{G:"line-left",H:"left"},{G:"line-right",H:"right"},{G:"over",H:"top"},{G:"under",H:"bottom"}],"vertical-rl":[{G:"line-left",H:"top"},{G:"line-right",H:"bottom"},{G:"over",H:"right"},{G:"under",H:"left"}],"vertical-lr":[{G:"line-left",H:"top"},{G:"line-right",H:"bottom"},{G:"over",H:"right"},{G:"under",H:"left"}]};var mj={Sd:"ltr",Ud:"rtl"};ca("vivliostyle.constants.PageProgression",mj);mj.LTR="ltr";mj.RTL="rtl";var nj={Rd:"left",Td:"right"};ca("vivliostyle.constants.PageSide",nj);nj.LEFT="left";nj.RIGHT="right";var oj={transform:!0,"transform-origin":!0,position:!0};function pj(a,b,c){this.target=a;this.name=b;this.value=c}var qj={show:function(a){a.style.visibility="visible"},hide:function(a){a.style.visibility="hidden"},play:function(a){a.currentTime=0;a.play()},pause:function(a){a.pause()},resume:function(a){a.play()},mute:function(a){a.muted=!0},unmute:function(a){a.muted=!1}};function rj(a,b){var c=qj[b];return c?function(){for(var b=0;b<a.length;b++)try{c(a[b])}catch(e){}}:null}
function sj(a){this.d={};this.L=a;this.u=null;this.g=[];var b=this;this.A=function(a){var d=a.currentTarget,e=d.getAttribute("href")||d.getAttributeNS("http://www.w3.org/1999/xlink","href");e&&(a.preventDefault(),Sa(b,{type:"hyperlink",target:null,currentTarget:null,Xd:d,href:e}))};this.h={};this.b={width:0,height:0};this.k=this.j=!1;this.F=0;this.position=null;this.offset=-1;this.f=null;this.e=[];this.l={top:{},bottom:{},left:{},right:{}}}t(sj,Ra);
function tj(a){a.D=!0;a.L.setAttribute("data-vivliostyle-auto-page-width",!0)}function uj(a){a.B=!0;a.L.setAttribute("data-vivliostyle-auto-page-height",!0)}function vj(a,b,c){var d=a.h[c];d?d.push(b):a.h[c]=[b]}sj.prototype.zoom=function(a){u(this.L,"transform","scale("+a+")")};sj.prototype.w=function(){return this.u||this.L};
function wj(a,b){if(1==a.nodeType)return!1;var c=a.textContent;switch(b){case 0:return!!c.match(/^\s*$/);case 1:return!!c.match(/^[ \t\f]*$/);case 2:return 0==c.length}throw Error("Unexpected whitespace: "+b);}function xj(a,b,c,d,e,f,g,k){this.f=a;this.g=b;this.b=c;this.Ea=d;this.j=e;this.d=f;this.Hd=g;this.h=k;this.e=-1}function yj(a,b){return a.d?!b.d||a.Ea>b.Ea?!0:a.h:!1}function zj(a,b){return a.top-b.top}function Aj(a,b){return b.right-a.right}
function Bj(a,b,c,d,e,f,g){this.Z=a;this.Kc=d;this.ed=null;this.root=b;this.$=c;this.type=f;e&&(e.ed=this);this.b=g}function Cj(a,b){this.Fd=a;this.count=b}function Dj(a,b,c){this.X=a;this.parent=b;this.da=c;this.ba=0;this.K=!1;this.La=0;this.ca=b?b.ca:null;this.oa=this.va=null;this.I=!1;this.d=!0;this.e=!1;this.h=b?b.h:0;this.w=this.j=this.M=null;this.A=b?b.A:0;this.k=b?b.k:!1;this.b=this.B=this.u=null;this.l=b?b.l:{};this.g=b?b.g:!1;this.D=b?b.D:"ltr";this.f=b?b.f:null}
function Ej(a){a.d=!0;a.h=a.parent?a.parent.h:0;a.b=null;a.ba=0;a.K=!1;a.j=null;a.w=null;a.u=null;a.B=null;a.va=null;a.k=a.parent?a.parent.k:!1;a.g=a.parent?a.parent.g:!1;a.va=null}function Fj(a){var b=new Dj(a.X,a.parent,a.da);b.ba=a.ba;b.K=a.K;b.va=a.va;b.La=a.La;b.ca=a.ca;b.oa=a.oa;b.d=a.d;b.h=a.h;b.j=a.j;b.w=a.w;b.k=a.k;b.A=a.A;b.u=a.u;b.B=a.B;b.b=a.b;b.f=a.f;b.g=a.g;b.e=a.e;return b}Dj.prototype.modify=function(){return this.I?Fj(this):this};
function Gj(a){var b=a;do{if(b.I)break;b.I=!0;b=b.parent}while(b);return a}Dj.prototype.clone=function(){for(var a=Fj(this),b=a,c;null!=(c=b.parent);)c=Fj(c),b=b.parent=c;return a};function Hj(a){return{ea:a.X,La:a.La,ca:a.ca,va:a.va,oa:a.oa?Hj(a.oa):null}}function Ij(a){var b=a,c=[];do b.f&&b.parent&&b.parent.f!==b.f||c.push(Hj(b)),b=b.parent;while(b);return{ia:c,ba:a.ba,K:a.K}}function Jj(a){this.Ra=a;this.b=this.d=null}
Jj.prototype.clone=function(){var a=new Jj(this.Ra);if(this.d){a.d=[];for(var b=0;b<this.d.length;++b)a.d[b]=this.d[b]}if(this.b)for(a.b=[],b=0;b<this.b.length;++b)a.b[b]=this.b[b];return a};function Kj(a,b){this.d=a;this.b=b}Kj.prototype.clone=function(){return new Kj(this.d.clone(),this.b)};function Lj(){this.b=[]}Lj.prototype.clone=function(){for(var a=new Lj,b=this.b,c=a.b,d=0;d<b.length;d++)c[d]=b[d].clone();return a};function Mj(){this.d=0;this.b={};this.e=0}
Mj.prototype.clone=function(){var a=new Mj;a.d=this.d;a.f=this.f;a.e=this.e;a.g=this.g;for(var b in this.b)a.b[b]=this.b[b].clone();return a};function Nj(a){this.d=a;this.B=this.A=this.height=this.width=this.w=this.k=this.D=this.j=this.wa=this.ga=this.Fa=this.aa=this.marginBottom=this.marginTop=this.marginRight=this.marginLeft=this.top=this.left=0;this.Sb=this.I=null;this.qa=this.Tb=this.Ga=this.Ub=this.e=0;this.b=!1}function Oj(a){return a.marginTop+a.ga+a.k}
function Pj(a){return a.marginBottom+a.wa+a.w}function Qj(a){return a.marginLeft+a.aa+a.j}function Rj(a){return a.marginRight+a.Fa+a.D}function Sj(a,b){a.d=b.d;a.left=b.left;a.top=b.top;a.marginLeft=b.marginLeft;a.marginRight=b.marginRight;a.marginTop=b.marginTop;a.marginBottom=b.marginBottom;a.aa=b.aa;a.Fa=b.Fa;a.ga=b.ga;a.wa=b.wa;a.j=b.j;a.D=b.D;a.k=b.k;a.w=b.w;a.width=b.width;a.height=b.height;a.A=b.A;a.B=b.B;a.Sb=b.Sb;a.I=b.I;a.e=b.e;a.Ub=b.Ub;a.Ga=b.Ga;a.b=b.b}
function Tj(a,b,c){a.top=b;a.height=c;u(a.d,"top",b+"px");u(a.d,"height",c+"px")}function Uj(a,b,c){a.left=b;a.width=c;u(a.d,"left",b+"px");u(a.d,"width",c+"px")}function Vj(a,b){this.b=a;this.d=b}t(Vj,Tc);Vj.prototype.Ob=function(a){this.b.appendChild(this.b.ownerDocument.createTextNode(a.b));return null};Vj.prototype.Pb=function(a){var b=this.b.ownerDocument.createElementNS("http://www.w3.org/1999/xhtml","img");b.setAttribute("src",a.url);this.b.appendChild(b);return null};
Vj.prototype.Xa=function(a){this.ib(a.values);return null};Vj.prototype.xb=function(a){a=a.fa().evaluate(this.d);"string"===typeof a&&this.b.appendChild(this.b.ownerDocument.createTextNode(a));return null};function Wj(a){return null!=a&&a!==Gd&&a!==Fd&&a!==xd};function Xj(a,b,c){this.e=a;this.d=b;this.b=c}function Yj(){this.map=[]}function Zj(a){return 0==a.map.length?0:a.map[a.map.length-1].b}function ak(a,b){if(0==a.map.length)a.map.push(new Xj(b,b,b));else{var c=a.map[a.map.length-1],d=c.b+b-c.d;c.d==c.e?(c.d=b,c.e=b,c.b=d):a.map.push(new Xj(b,b,d))}}function bk(a,b){0==a.map.length?a.map.push(new Xj(b,0,0)):a.map[a.map.length-1].d=b}function ck(a,b){var c=Ka(a.map.length,function(c){return b<=a.map[c].d}),c=a.map[c];return c.b-Math.max(0,c.e-b)}
function dk(a,b){var c=Ka(a.map.length,function(c){return b<=a.map[c].b}),c=a.map[c];return c.e-(c.b-b)}
function ek(a,b,c,d,e,f,g){this.$=a;this.root=a.root;this.ga=c;this.f=d;this.h=f;this.d=this.root;this.u={};this.w={};this.B=[];this.l=this.k=null;this.A=new ei(b,d,g);this.e=new Yj;this.Ra=!0;this.D=[];this.aa=e;this.M=this.I=!1;this.b=a=Mi(a,this.root);ak(this.e,a);b=fk(this,this.root);ni(this.A,this.root,b);gk(this,b,!1);this.j=!0;switch(this.root.namespaceURI){case "http://www.w3.org/1999/xhtml":case "http://www.gribuser.ru/xml/fictionbook/2.0":this.j=!1}this.D.push(!0);this.w={};this.w["e"+a]=
b;this.b++;hk(this,-1)}function ik(a,b,c,d){return(b=b[d])&&b.evaluate(a.f)!==c[d]}function jk(a,b,c){for(var d in c){var e=b[d];e?(a.u[d]=e,delete b[d]):(e=c[d])&&(a.u[d]=new V(e,33554432))}}var kk=["column-count","column-width"];
function gk(a,b,c){c||["writing-mode","direction"].forEach(function(a){b[a]&&(this.u[a]=b[a])},a);if(!a.I){c=ik(a,b,a.h.g,"background-color")?b["background-color"].evaluate(a.f):null;var d=ik(a,b,a.h.g,"background-image")?b["background-image"].evaluate(a.f):null;if(c&&c!==xd||d&&d!==xd)jk(a,b,a.h.g),a.I=!0}if(!a.M)for(c=0;c<kk.length;c++)if(ik(a,b,a.h.j,kk[c])){jk(a,b,a.h.j);a.M=!0;break}if(c=b["font-size"]){d=c.evaluate(a.f);c=d.C;switch(d.ja){case "em":case "rem":c*=a.f.g;break;case "ex":case "rex":c*=
a.f.g*ec.ex/ec.em;break;case "%":c*=a.f.g/100;break;default:(d=ec[d.ja])&&(c*=d)}a.f.aa=c}}function fk(a,b){if(b.style instanceof CSSStyleDeclaration){var c=b.getAttribute("style");if(c){var d=a.$.url,e=new ui(a.ga,a.h),c=new Pb(c);try{Pf(new Hf(yf,c,e,d),Number.POSITIVE_INFINITY,!1,!0,!1)}catch(f){w("Style attribute parse error: "+f)}return e.b}}return{}}
function hk(a,b){if(!(b>=a.b)){var c=a.f,d=Mi(a.$,a.root);if(b<d){var e=a.g(a.root,!1),f=e["flow-into"],f=f?f.evaluate(c,"flow-into").toString():"body";lk(a,f,e,a.root,d)}d=Pi(a.$,b);e=Ni(a.$,d,0,!1);if(!(e>=a.b))for(;;){if(1!=d.nodeType)e+=d.textContent.length;else{var g=d;if(e!=Mi(a.$,g))throw Error("Inconsistent offset");var k=a.g(g,!1);if(f=k["flow-into"])f=f.evaluate(c,"flow-into").toString(),lk(a,f,k,g,e);e++}if(e>=a.b)break;f=d.firstChild;if(null==f)for(;!(f=d.nextSibling);)if(d=d.parentNode,
d===a.root)return;d=f}}}function lk(a,b,c,d,e){var f=0,g=Number.POSITIVE_INFINITY,k=!1,h=!1,l=!1,n=c["flow-options"];if(n){var p;a:{if(k=n.evaluate(a.f,"flow-options")){h=new Xf;try{k.S(h);p=h.b;break a}catch(q){w("toSet: "+q)}}p={}}k=!!p.exclusive;h=!!p["static"];l=!!p.last}(p=c["flow-linger"])&&(g=Zf(p.evaluate(a.f,"flow-linger"),Number.POSITIVE_INFINITY));(c=c["flow-priority"])&&(f=Zf(c.evaluate(a.f,"flow-priority"),0));d=new xj(b,d,e,f,g,k,h,l);a.B.push(d);a.l==b&&(a.l=null);a.k&&mk(a.k,d)}
function nk(a,b,c){var d=-1;if(b<=a.b&&(d=ck(a.e,b),d+=c,d<Zj(a.e)))return dk(a.e,d);if(null==a.d)return Number.POSITIVE_INFINITY;for(var e=a.f;;){var f=a.d.firstChild;if(null==f)for(;;){if(1==a.d.nodeType){var f=a.A,g=a.d;if(f.wa.pop()!==g)throw Error("Invalid call to popElement");f.Ya.pop();f.pop();li(f);a.Ra=a.D.pop()}if(f=a.d.nextSibling)break;a.d=a.d.parentNode;if(a.d===a.root)return a.d=null,b<a.b&&(0>d&&(d=ck(a.e,b),d+=c),d<=Zj(a.e))?dk(a.e,d):Number.POSITIVE_INFINITY}a.d=f;if(1!=a.d.nodeType)a.b+=
a.d.textContent.length,a.Ra?ak(a.e,a.b):bk(a.e,a.b);else{g=a.d;f=fk(a,g);a.D.push(a.Ra);ni(a.A,g,f);a.j||"body"!=g.localName||g.parentNode!=a.root||(gk(a,f,!0),a.j=!0);var k=f["flow-into"];k&&(k=k.evaluate(e,"flow-into").toString(),lk(a,k,f,g,a.b),a.Ra=!!a.aa[k]);a.Ra&&(g=f.display)&&g.evaluate(e,"display")===Fd&&(a.Ra=!1);if(Mi(a.$,a.d)!=a.b)throw Error("Inconsistent offset");a.w["e"+a.b]=f;a.b++;a.Ra?ak(a.e,a.b):bk(a.e,a.b);if(b<a.b&&(0>d&&(d=ck(a.e,b),d+=c),d<=Zj(a.e)))return dk(a.e,d)}}}
ek.prototype.g=function(a,b){var c=Mi(this.$,a),d="e"+c;b&&(c=Ni(this.$,a,0,!0));this.b<=c&&nk(this,c,0);return this.w[d]};function ok(a,b){return a?b?"avoid"==a||"avoid"==b?"avoid":a:a:b}var pk={img:!0,svg:!0,audio:!0,video:!0};
function qk(a,b,c){var d=a.b;if(!d)return NaN;if(1==d.nodeType){if(a.K){var e=d.getBoundingClientRect();if(e.right>=e.left&&e.bottom>=e.top)return c?e.left:e.bottom}return NaN}var e=NaN,f=d.ownerDocument.createRange(),g=d.textContent.length;if(!g)return NaN;a.K&&(b+=g);b>=g&&(b=g-1);f.setStart(d,b);f.setEnd(d,b+1);a=rk(f);if(b=c){b=document.body;if(null==Va){var k=b.ownerDocument,f=k.createElement("div");f.style.position="absolute";f.style.top="0px";f.style.left="0px";f.style.width="100px";f.style.height=
"100px";f.style.overflow="hidden";f.style.lineHeight="16px";f.style.fontSize="16px";u(f,"writing-mode","vertical-rl");b.appendChild(f);g=k.createTextNode("a a a a a a a a a a a a a a a a");f.appendChild(g);k=k.createRange();k.setStart(g,0);k.setEnd(g,1);Va=50>k.getBoundingClientRect().left;b.removeChild(f)}b=Va}if(b){b=d.ownerDocument.createRange();b.setStart(d,0);b.setEnd(d,d.textContent.length);d=rk(b);b=[];for(f=0;f<a.length;f++){g=a[f];for(k=0;k<d.length;k++){var h=d[k];if(g.top>=h.top&&g.bottom<=
h.bottom&&1>Math.abs(g.right-h.right)){b.push({top:g.top,left:h.left,bottom:h.bottom,right:h.right});break}}k==d.length&&(w("Could not fix character box"),b.push(g))}a=b}for(b=d=0;b<a.length;b++)f=a[b],g=c?f.bottom-f.top:f.right-f.left,f.right>f.left&&f.bottom>f.top&&(isNaN(e)||g>d)&&(e=c?f.left:f.bottom,d=g);return e}function sk(a,b){this.e=a;this.f=b}sk.prototype.d=function(a,b){return b<this.f?null:tk(a,this,0<b)};sk.prototype.b=function(){return this.f};
function uk(a,b,c,d){this.position=a;this.f=b;this.g=c;this.e=d}uk.prototype.d=function(a,b){var c;b<this.b()?c=null:(a.e=this.e,c=this.position);return c};uk.prototype.b=function(){return("avoid"==this.f?1:0)+(this.g?3:0)+(this.position.parent?this.position.parent.h:0)};function vk(a,b,c){this.da=a;this.d=b;this.b=c}
function wk(a){for(var b=1;b<a.length;b++){var c=a[b-1],d=a[b];c===d?w("validateCheckPoints: duplicate entry"):c.da>=d.da?w("validateCheckPoints: incorrect boxOffset"):c.X==d.X&&(d.K?c.K&&w("validateCheckPoints: duplicate after points"):c.K?w("validateCheckPoints: inconsistent after point"):d.da-c.da!=d.ba-c.ba&&w("validateCheckPoints: boxOffset inconsistent with offsetInNode"))}}
function xk(a,b,c){Nj.call(this,a);this.Rc=a.lastChild;this.h=b;this.nc=c;this.vd=a.ownerDocument;this.oc=!1;this.na=this.jb=this.Pa=this.Tc=0;this.Ya=this.Rb=this.l=this.f=null;this.Sc=!1;this.M=this.g=this.u=null;this.hd=!0;this.rc=this.qc=0}t(xk,Nj);xk.prototype.clone=function(){var a=new xk(this.d,this.h,this.nc);Sj(a,this);a.Rc=this.Rc;a.oc=this.oc;a.l=this.l?this.l.clone():null;a.Rb=this.Rb.concat();return a};
function yk(a,b){var c=b.getBoundingClientRect(),d=(a.b?a.jb:a.Tc)-a.f.W,e=(a.b?a.Tc:a.Pa)-a.f.T;return{left:c.left-d,top:c.top-e,right:c.right-d,bottom:c.bottom-e}}function zk(a,b){return a.b?b<a.na:b>a.na}function Ak(a,b,c){var d=new Dj(b.ea,c,0);d.La=b.La;d.ca=b.ca;d.va=b.va;d.oa=b.oa?Ak(a,b.oa,Gj(c)):null;return d}
function Bk(a,b){var c=M("openAllViews"),d=b.ia;Ck(a.h,a.d,a.oc);var e=d.length-1,f=null;af(function(){for(;0<=e;){f=Ak(a,d[e],f);if(0==e&&(f.ba=b.ba,f.K=b.K,f.K))break;var c=Dk(a.h,f,0==e&&0==f.ba);e--;if(c.za())return c}return N(!1)}).then(function(){Q(c,f)});return O(c)}var Ek=/^[^A-Za-z0-9_\u009E\u009F\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02AF\u037B-\u037D\u0386\u0388-\u0482\u048A-\u0527]*([A-Za-z0-9_\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02AF\u037B-\u037D\u0386\u0388-\u0482\u048A-\u0527][^A-Za-z0-9_\u009E\u009F\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02AF\u037B-\u037D\u0386\u0388-\u0482\u048A-\u0527]*)?/;
function Fk(a,b){if(b.f&&b.d&&!b.K&&0==b.f.count&&1!=b.b.nodeType){var c=b.b.textContent.match(Ek);return Gk(a.h,b,c[0].length)}return N(b)}function Hk(a,b,c){var d=M("buildViewToNextBlockEdge");bf(function(d){b.b&&c.push(Gj(b));Fk(a,b).then(function(f){f!==b&&(b=f,c.push(Gj(b)));Ik(a.h,b).then(function(c){(b=c)?b.j&&!a.b?Jk(a,b).then(function(c){b=c;!b||b.e||0<a.h.g.b.length?R(d):df(d)}):b.d?df(d):R(d):R(d)})})}).then(function(){Q(d,b)});return O(d)}
function Kk(a,b){if(!b.b)return N(b);var c=b.X,d=M("buildDeepElementView");bf(function(d){Fk(a,b).then(function(f){if(f!==b){for(var g=f;g&&g.X!=c;)g=g.parent;if(null==g){b=f;R(d);return}}Ik(a.h,f).then(function(a){(b=a)&&b.X!=c?df(d):R(d)})})}).then(function(){Q(d,b)});return O(d)}function Lk(a,b,c,d,e){var f=a.vd.createElement("div");a.b?(u(f,"height",d+"px"),u(f,"width",e+"px")):(u(f,"width",d+"px"),u(f,"height",e+"px"));u(f,"float",c);u(f,"clear",c);a.d.insertBefore(f,b);return f}
function Mk(a){for(var b=a.d.firstChild;b;){var c=b.nextSibling;if(1==b.nodeType){var d=b.style.cssFloat;if("left"==d||"right"==d)a.d.removeChild(b);else break}b=c}}function Nk(a){for(var b=a.d.firstChild,c=a.Ya,d=a.b?a.f.T:a.f.W,e=a.b?a.f.P:a.f.U,f=0;f<c.length;f++){var g=c[f],k=g.P-g.T;g.left=Lk(a,b,"left",g.W-d,k);g.right=Lk(a,b,"right",e-g.U,k)}}
function Ok(a,b,c,d,e){var f;if(b&&b.K&&!b.d&&(f=qk(b,0,a.b),!isNaN(f)))return f;b=c[d];for(e-=b.da;;){f=qk(b,e,a.b);if(!isNaN(f))return f;if(0<e)e--;else{d--;if(0>d)return a.Pa;b=c[d];1!=b.b.nodeType&&(e=b.b.textContent.length)}}}function Sk(a){return"number"==typeof a?a:(a=a.match(/^(-?[0-9]*(\.[0-9]*)?)px$/))?parseFloat(a[0]):0}
function Tk(a,b){var c=a.nc.b.getComputedStyle(b,null),d=new ee;c&&(d.left=Sk(c.marginLeft),d.top=Sk(c.marginTop),d.right=Sk(c.marginRight),d.bottom=Sk(c.marginBottom));return d}
function Uk(a,b,c){if(a=a.nc.b.getComputedStyle(b,null))c.marginLeft=Sk(a.marginLeft),c.aa=Sk(a.borderLeftWidth),c.j=Sk(a.paddingLeft),c.marginTop=Sk(a.marginTop),c.ga=Sk(a.borderTopWidth),c.k=Sk(a.paddingTop),c.marginRight=Sk(a.marginRight),c.Fa=Sk(a.borderRightWidth),c.D=Sk(a.paddingRight),c.marginBottom=Sk(a.marginBottom),c.wa=Sk(a.borderBottomWidth),c.w=Sk(a.paddingBottom)}function Vk(a,b,c){b=new vk(b,c,c);a.g?a.g.push(b):a.g=[b]}
function Wk(a,b,c,d){if(a.g&&a.g[a.g.length-1].b)return Vk(a,b,c),N(!0);d+=40*(a.b?-1:1);var e=a.l,f=!e;if(f){var g=a.d.ownerDocument.createElement("div");u(g,"position","absolute");var k=a.h.clone(),e=new xk(g,k,a.nc);a.l=e;e.b=Xk(a.h,a.b,g);e.oc=!0;a.b?(e.left=0,u(e.d,"width","2em")):(e.top=a.jb,u(e.d,"height","2em"))}a.d.appendChild(e.d);Uk(a,e.d,e);g=(a.b?-1:1)*(d-a.Pa);a.b?e.height=a.f.P-a.f.T-Oj(e)-Pj(e):e.width=a.f.U-a.f.W-Qj(e)-Rj(e);d=(a.b?-1:1)*(a.jb-d)-(a.b?Qj(e)-Rj(e):Oj(e)+Pj(e));if(f&&
18>d)return a.d.removeChild(e.d),a.l=null,Vk(a,b,c),N(!0);if(!a.b&&e.top<g)return a.d.removeChild(e.d),Vk(a,b,c),N(!0);var h=M("layoutFootnoteInner");a.b?Uj(e,0,d):Tj(e,g,d);e.A=a.A+a.left+Qj(a);e.B=a.B+a.top+Oj(a);e.I=a.I;var l=new Jj(c);f?(Yk(e),f=N(!0)):0==e.I.length?(Zk(e),f=N(!0)):f=$k(e);f.then(function(){al(e,l).then(function(d){a.b?(a.na=a.jb+(e.e+Qj(e)+Rj(e)),Uj(e,0,e.e)):(a.na=a.jb-(e.e+Oj(e)+Pj(e)),Tj(e,a.na-a.Pa,e.e));var f;!a.b&&0<e.I.length?f=$k(e):f=N(d);f.then(function(d){d=new vk(b,
c,d?d.Ra:null);a.g?a.g.push(d):a.g=[d];Q(h,!0)})})});return O(h)}
function bl(a,b){var c=M("layoutFootnote"),d=b.b;d.setAttribute("style","");u(d,"display","inline-block");d.textContent="M";var e=d.getBoundingClientRect(),f=a.b?e.left:e.bottom;d.textContent="";cl(a.h,b,"footnote-call",d);d.textContent||d.parentNode.removeChild(d);d={ia:[{ea:b.X,La:0,ca:b.ca,va:null,oa:null}],ba:0,K:!1};e=b.da;b=b.modify();b.K=!0;Wk(a,e,d,f).then(function(){a.l&&a.l.d.parentNode&&a.d.removeChild(a.l.d);zk(a,f)&&0!=a.u.length&&(b.e=!0);Q(c,b)});return O(c)}
function dl(a,b){var c=M("layoutFloat"),d=b.b,e=b.j,f=b.M,g=b.parent?b.parent.D:"ltr",k=a.h.g,h=b.b.parentNode;"page"===f?el(k,d,e):(u(d,"float","none"),u(d,"position","absolute"),u(d,"left","auto"),u(d,"right","auto"),u(d,"top","auto"));Kk(a,b).then(function(l){var n=yk(a,d),p=Tk(a,d),n=new ce(n.left-p.left,n.top-p.top,n.right+p.right,n.bottom+p.bottom);if("page"===f)fl(k,b,a.h)?(n=h.ownerDocument.createElement("span"),u(n,"width","0"),u(n,"height","0"),h.appendChild(n),l.b=n,Q(c,l)):gl(k,b,n).then(function(){Q(c,
null)});else{e=hl(e,a.b,g);for(var p=a.b?a.f.T:a.f.W,q=a.b?a.f.P:a.f.U,r=b.parent;r&&r.d;)r=r.parent;if(r){var v=r.b.ownerDocument.createElement("div");v.style.left="0px";v.style.top="0px";a.b?(v.style.bottom="0px",v.style.width="1px"):(v.style.right="0px",v.style.height="1px");r.b.appendChild(v);var y=yk(a,v),p=Math.max(a.b?y.top:y.left,p),q=Math.min(a.b?y.bottom:y.right,q);r.b.removeChild(v);r=a.b?n.P-n.T:n.U-n.W;"left"==e?q=Math.max(q,p+r):p=Math.min(p,q-r)}p=new ce(p,(a.b?-1:1)*a.f.T,q,(a.b?-1:
1)*a.f.P);q=n;a.b&&(q=ue(n));ze(p,a.Ya,q,e);a.b&&(n=new ce(-q.P,q.W,-q.T,q.U));u(d,"left",n.W-a.f.W+a.j+"px");u(d,"top",n.T-a.f.T+a.k+"px");n=a.b?n.W:n.P;zk(a,n)&&0!=a.u.length?(b=b.modify(),b.e=!0,Q(c,b)):(Mk(a),p=a.b?ue(a.f):a.f,Ae(p,a.Ya,q,e),Nk(a),"left"==e?a.qc=n:a.rc=n,il(a,n),Q(c,l))}});return O(c)}
function jl(a,b){for(var c=a.b,d="";c&&b&&!d&&(1!=c.nodeType||(d=c.style.textAlign,b));c=c.parentNode);if(!b||"justify"==d){var c=a.b,e=c.ownerDocument,d=e.createElement("span");d.style.visibility="hidden";d.textContent=" ########################";d.setAttribute("data-adapt-spec","1");var f=b&&(a.K||1!=c.nodeType)?c.nextSibling:c;if(c=c.parentNode)c.insertBefore(d,f),b||(e=e.createElement("div"),c.insertBefore(e,f),d.style.lineHeight="80px",e.style.marginTop="-80px",e.style.height="0px",e.setAttribute("data-adapt-spec",
"1"))}}function kl(a,b,c,d){var e=M("processLineStyling");wk(d);var f=d.concat([]);d.splice(0,d.length);var g=0,k=b.f;0==k.count&&(k=k.Fd);bf(function(d){if(k){var e=ll(a,f),n=k.count-g;if(e.length<=n)R(d);else{var p=ml(a,f,e[n-1]);nl(a,p,!1,!1).then(function(){g+=n;Gk(a.h,p,0).then(function(e){b=e;jl(b,!1);k=b.f;f=[];Hk(a,b,f).then(function(b){c=b;0<a.h.g.b.length?R(d):df(d)})})})}}else R(d)}).then(function(){Array.prototype.push.apply(d,f);wk(d);Q(e,c)});return O(e)}
function ol(a,b){for(var c=0,d=0,e=b.length-1;0<=e;e--){var f=b[e];if(!f.K||!f.b||1!=f.b.nodeType)break;f=Tk(a,f.b);f=a.b?-f.left:f.bottom;0<f?c=Math.max(c,f):d=Math.min(d,f)}return c-d}
function pl(a,b){var c=M("layoutBreakableBlock"),d=[];Hk(a,b,d).then(function(e){if(0<a.h.g.b.length)Q(c,e);else{var f=d.length-1;if(0>f)Q(c,e);else{var f=Ok(a,e,d,f,d[f].da),g=zk(a,f);null==e&&(f+=ol(a,d));il(a,f);var k;b.f?k=kl(a,b,e,d):k=N(e);k.then(function(b){0<d.length&&(a.u.push(new sk(d,d[0].h)),g&&(2!=d.length&&0<a.u.length||d[0].X!=d[1].X||!pk[d[0].X.localName])&&b&&(b=b.modify(),b.e=!0));Q(c,b)})}}});return O(c)}
function ml(a,b,c){wk(b);for(var d=0,e=b[0].da,f=d,g=b.length-1,k=b[g].da,h;e<k;){h=e+Math.ceil((k-e)/2);for(var f=d,l=g;f<l;){var n=f+Math.ceil((l-f)/2);b[n].da>h?l=n-1:f=n}l=Ok(a,null,b,f,h);if(a.b?l<c:l>c){for(k=h-1;b[f].da==h;)f--;g=f}else il(a,l),e=h,d=f}a=b[f];b=a.b;1!=b.nodeType&&(a.K?a.ba=b.length:(e-=a.da,c=b.data,173==c.charCodeAt(e)?(b.replaceData(e,c.length-e,"-"),e++):(d=c.charAt(e),e++,f=c.charAt(e),b.replaceData(e,c.length-e,Ha(d)&&Ha(f)?"-":"")),0<e&&(a=a.modify(),a.ba+=e,a.u=null)));
return a}
function ll(a,b){for(var c=[],d=b[0].b,e=b[b.length-1].b,f=[],g=d.ownerDocument.createRange(),k=!1,h=null,l=!1,n=!0;n;){var p=!0;do{var q=null;d==e&&(n=!1);1!=d.nodeType?(l||(g.setStartBefore(d),l=!0),h=d):k?k=!1:d.getAttribute("data-adapt-spec")?p=!l:q=d.firstChild;q||(q=d.nextSibling,q||(k=!0,q=d.parentNode));d=q}while(p&&n);if(l){g.setEndAfter(h);l=rk(g);for(p=0;p<l.length;p++)f.push(l[p]);l=!1}}f.sort(a.b?Aj:zj);h=d=k=g=e=0;for(n=a.b?-1:1;;){if(h<f.length&&(l=f[h],p=1,0<d&&(p=Math.max(a.b?l.right-
l.left:l.bottom-l.top,1),p=n*(a.b?l.right:l.top)<n*e?n*((a.b?l.left:l.bottom)-e)/p:n*(a.b?l.left:l.bottom)>n*g?n*(g-(a.b?l.right:l.top))/p:1),0==d||.6<=p||.2<=p&&(a.b?l.top:l.left)>=k-1)){k=a.b?l.bottom:l.right;a.b?(e=0==d?l.right:Math.max(e,l.right),g=0==d?l.left:Math.min(g,l.left)):(e=0==d?l.top:Math.min(e,l.top),g=0==d?l.bottom:Math.max(g,l.bottom));d++;h++;continue}0<d&&(c.push(g),d=0);if(h>=f.length)break}c.sort(La);a.b&&c.reverse();return c}
function ql(a,b){if(!a.g)return N(!0);for(var c=!1,d=a.g.length-1;0<=d;--d){var e=a.g[d];if(e.da<=b)break;a.g.pop();e.b!==e.d&&(c=!0)}if(!c)return N(!0);var f=M("clearFootnotes"),g=a.e+a.Pa,k=a.g;a.l=null;a.g=null;var h=0;af(function(){for(;h<k.length;){var b=k[h++],b=Wk(a,b.da,b.d,g);if(b.za())return b}return N(!1)}).then(function(){Q(f,!0)});return O(f)}
function tk(a,b,c){var d=b.e,e;if(c)e=c=1;else{for(e=d[0];e.parent&&e.d;)e=e.parent;c=Math.max((e.l.widows||1)-0,1);e=Math.max((e.l.orphans||1)-0,1)}var f=ll(a,d),g=a.na,d=Ka(f.length,function(b){return a.b?f[b]<g:f[b]>g}),d=Math.min(f.length-c,d);if(d<e)return null;g=f[d-1];if(b=ml(a,b.e,g))a.e=(a.b?-1:1)*(g-a.Pa);return b}
function nl(a,b,c,d){var e=b;c=c||null!=b.b&&1==b.b.nodeType&&!b.K;do{var f=e.b.parentNode;if(!f)break;var g=f,k=e.b;if(g)for(var h=void 0;(h=g.lastChild)!=k;)g.removeChild(h);c&&(f.removeChild(e.b),c=!1);e=e.parent}while(e);d&&jl(b,!0);return ql(a,b.da)}
function rl(a,b,c){var d=M("findAcceptableBreak"),e=null,f=0,g=0;do for(var f=g,g=Number.MAX_VALUE,k=a.u.length-1;0<=k&&!e;--k){var e=a.u[k].d(a,f),h=a.u[k].b();h>f&&(g=Math.min(g,h))}while(g>f&&!e);var l=!1;if(!e){w("Could not find any page breaks?!!");if(a.hd)return sl(a,b).then(function(b){b?(b=b.modify(),b.e=!1,nl(a,b,l,!0).then(function(){Q(d,b)})):Q(d,b)}),O(d);e=c;l=!0}nl(a,e,l,!0).then(function(){Q(d,e)});return O(d)}
function tl(a){a=a.toString();return""==a||"auto"==a||!!a.match(/^0+(.0*)?[^0-9]/)}function ul(a,b,c,d,e){if(!b)return!1;var f=qk(b,0,a.b),g=zk(a,f);c&&(f+=ol(a,c));il(a,f);if(d||!g)b=new uk(Gj(b),e,g,a.e),a.u.push(b);return g}
function vl(a,b){if(b.b.parentNode){var c=Tk(a,b.b),d=b.b.ownerDocument.createElement("div");a.b?(d.style.bottom="0px",d.style.width="1px",d.style.marginRight=c.right+"px"):(d.style.right="0px",d.style.height="1px",d.style.marginTop=c.top+"px");b.b.parentNode.insertBefore(d,b.b);var e=d.getBoundingClientRect(),e=a.b?e.right:e.top,f=a.b?-1:1,g;switch(b.w){case "left":g=a.qc;break;case "right":g=a.rc;break;default:g=f*Math.max(a.rc*f,a.qc*f)}e*f>=g*f?b.b.parentNode.removeChild(d):(e=Math.max(1,(g-e)*
f),a.b?d.style.width=e+"px":d.style.height=e+"px",e=d.getBoundingClientRect(),e=a.b?e.left:e.bottom,a.b?(g=e+c.right-g,0<g==0<=c.right&&(g+=c.right),d.style.marginLeft=g+"px"):(g-=e+c.top,0<g==0<=c.top&&(g+=c.top),d.style.marginBottom=g+"px"))}}
function wl(a,b,c){var d=M("skipEdges"),e=c?"avoid":null,f=null,g=[];bf(function(c){for(;b;){do if(b.b){if(b.d&&1!=b.b.nodeType){if(wj(b.b,b.A))break;if(!b.K){ul(a,f,null,!0,e)?(b=(f||b).modify(),b.e=!0):(b=b.modify(),b.u=e);R(c);return}}if(!b.K&&(b.w&&vl(a,b),b.j)){ul(a,f,null,!0,e)&&(b=(f||b).modify(),b.e=!0);R(c);return}if(1==b.b.nodeType){var d=b.b.style;if(b.K){if(f=Gj(b),g.push(f),e=ok(b.B,e),d&&(!tl(d.paddingBottom)||!tl(d.borderBottomWidth))){if(ul(a,f,null,!0,e)){b=(f||b).modify();b.e=!0;
R(c);return}g=[f];f=e=null}}else{if((e=ok(b.u,e))&&"avoid"!=e&&"auto"!=e){R(c);a.M=e;return}if(pk[b.b.localName]){ul(a,f,null,!0,e)&&(b=(f||b).modify(),b.e=!0);R(c);return}if(d&&(!tl(d.paddingTop)||!tl(d.borderTopWidth))){if(ul(a,f,null,!0,e)){b=(f||b).modify();b.e=!0;R(c);return}f=e=null;g=[]}}}}while(0);d=Ik(a.h,b);if(d.za()){d.then(function(a){b=a;df(c)});return}b=d.Wb()}0!=a.u.length&&ul(a,f,g,!1,e)&&f&&(b=f.modify(),b.e=!0);R(c)}).then(function(){Q(d,b)});return O(d)}
function sl(a,b){var c=b,d=M("skipEdges"),e=null;bf(function(d){for(;b;){do if(b.b){if(b.d&&1!=b.b.nodeType){if(wj(b.b,b.A))break;if(!b.K){R(d);return}}if(!b.K&&b.j){R(d);return}if(1==b.b.nodeType){var g=b.b.style;if(b.K)e=ok(b.B,e);else{if((e=ok(b.u,e))&&"avoid"!=e&&"auto"!=e){R(d);a.M=e;return}if(pk[b.b.localName]){R(d);return}if(g&&(!tl(g.paddingTop)||!tl(g.borderTopWidth))){R(d);return}}}}while(0);g=Ik(a.h,b);if(g.za()){g.then(function(a){b=a;df(d)});return}b=g.Wb()}c=null;R(d)}).then(function(){Q(d,
c)});return O(d)}function Jk(a,b){return"footnote"==b.j?bl(a,b):dl(a,b)}function xl(a,b,c){var d=M("layoutNext");wl(a,b,c).then(function(c){b=c;if(!b||a.M||b.e)Q(d,b);else if(b.j)Jk(a,b).pa(d);else{a:{if(!b.K)switch(b.X.namespaceURI){case "http://www.w3.org/2000/svg":c=!1;break a}c=!0}c?pl(a,b).pa(d):Kk(a,b).pa(d)}});return O(d)}
function Zk(a){var b=a.d.ownerDocument.createElement("div");b.style.position="absolute";b.style.top=a.k+"px";b.style.right=a.D+"px";b.style.bottom=a.w+"px";b.style.left=a.j+"px";a.d.appendChild(b);var c=b.getBoundingClientRect();a.d.removeChild(b);var b=a.A+a.left+Qj(a),d=a.B+a.top+Oj(a);a.f=new ce(b,d,b+a.width,d+a.height);a.Tc=c?a.b?c.top:c.left:0;a.Pa=c?a.b?c.right:c.top:0;a.jb=c?a.b?c.left:c.bottom:0;a.qc=a.Pa;a.rc=a.Pa;a.na=a.jb;c=a.f;b=a.A+a.left+Qj(a);d=a.B+a.top+Oj(a);b=a.Sb?ke(a.Sb,b,d):
me(b,d,b+a.width,d+a.height);a.Ya=we(c,[b],a.I,a.Ga,a.b);Nk(a);a.g=null}function Yk(a){a.Rb=[];u(a.d,"width",a.width+"px");u(a.d,"height",a.height+"px");Zk(a);a.e=0;a.Sc=!1;a.M=null}function il(a,b){a.e=Math.max((a.b?-1:1)*(b-a.Pa),a.e)}function yl(a,b){var c=b.b;if(!c)return N(!0);var d=M("layoutOverflownFootnotes"),e=0;af(function(){for(;e<c.length;){var b=c[e++],b=Wk(a,0,b,a.Pa);if(b.za())return b}return N(!1)}).then(function(){Q(d,!0)});return O(d)}
function al(a,b){a.Rb.push(b);if(a.Sc)return N(b);var c=M("layout");yl(a,b).then(function(){Bk(a,b.Ra).then(function(b){var e=b,f=!0;a.u=[];bf(function(c){for(;b;){var k=!0;xl(a,b,f).then(function(h){f=!1;b=h;0<a.h.g.b.length?R(c):a.M?R(c):b&&b.e?rl(a,b,e).then(function(a){b=a;R(c)}):k?k=!1:df(c)});if(k){k=!1;return}}R(c)}).then(function(){var e=a.l;e&&(a.d.appendChild(e.d),a.b?a.e=this.Pa-this.jb:a.e=e.top+Oj(e)+e.e+Pj(e));if(b)if(0<a.h.g.b.length)Q(c,null);else{a.Sc=!0;e=new Jj(Ij(b));if(a.g){for(var f=
[],h=0;h<a.g.length;h++){var l=a.g[h].b;l&&f.push(l)}e.b=f.length?f:null}Q(c,e)}else Q(c,null)})})});return O(c)}function $k(a){for(var b=a.Rb;a.d.lastChild!=a.Rc;)a.d.removeChild(a.d.lastChild);Mk(a);Yk(a);var c=M("redoLayout"),d=0,e=null;bf(function(c){if(d<b.length){var g=b[d++];al(a,g).then(function(a){a?(e=a,R(c)):df(c)})}else R(c)}).then(function(){Q(c,e)});return O(c)};var zl=1;function Al(a,b,c,d,e){this.b={};this.children=[];this.e=null;this.h=0;this.d=a;this.name=b;this.eb=c;this.ya=d;this.parent=e;this.g="p"+zl++;e&&(this.h=e.children.length,e.children.push(this))}Al.prototype.f=function(){throw Error("E_UNEXPECTED_CALL");};Al.prototype.clone=function(){throw Error("E_UNEXPECTED_CALL");};function Bl(a,b){var c=a.b,d=b.b,e;for(e in c)Object.prototype.hasOwnProperty.call(c,e)&&(d[e]=c[e])}
function Cl(a,b){for(var c=0;c<a.children.length;c++)a.children[c].clone({parent:b})}function Dl(a){Al.call(this,a,null,null,[],null);this.b.width=new V(Yd,0);this.b.height=new V(Zd,0)}t(Dl,Al);
function El(a,b){this.e=b;var c=this;$b.call(this,a,function(a,b){var f=a.match(/^([^.]+)\.([^.]+)$/);if(f){var g=c.e.k[f[1]];if(g&&(g=this.qa[g])){if(b){var f=f[2],k=g.ga[f];if(k)g=k;else{switch(f){case "columns":var k=g.d.d,h=new Oc(k,0),l=Fl(g,"column-count"),n=Fl(g,"column-width"),p=Fl(g,"column-gap"),k=G(k,Qc(k,new Lc(k,"min",[h,l]),F(k,n,p)),p)}k&&(g.ga[f]=k);g=k}}else g=Fl(g,f[2]);return g}}return null})}t(El,$b);
function Gl(a,b,c,d,e,f,g){a=a instanceof El?a:new El(a,this);Al.call(this,a,b,c,d,e);this.e=this;this.J=f;this.j=g;this.b.width=new V(Yd,0);this.b.height=new V(Zd,0);this.b["wrap-flow"]=new V(ld,0);this.b.position=new V(Jd,0);this.b.overflow=new V(vd,0);this.k={}}t(Gl,Al);Gl.prototype.f=function(a){return new Hl(a,this)};Gl.prototype.clone=function(a){a=new Gl(this.d,this.name,a.eb||this.eb,this.ya,this.parent,this.J,this.j);Bl(this,a);Cl(this,a);return a};
function Il(a,b,c,d,e){Al.call(this,a,b,c,d,e);this.e=e.e;b&&(this.e.k[b]=this.g);this.b["wrap-flow"]=new V(ld,0)}t(Il,Al);Il.prototype.f=function(a){return new Jl(a,this)};Il.prototype.clone=function(a){a=new Il(a.parent.d,this.name,this.eb,this.ya,a.parent);Bl(this,a);Cl(this,a);return a};function Kl(a,b,c,d,e){Al.call(this,a,b,c,d,e);this.e=e.e;b&&(this.e.k[b]=this.g)}t(Kl,Al);Kl.prototype.f=function(a){return new Ll(a,this)};
Kl.prototype.clone=function(a){a=new Kl(a.parent.d,this.name,this.eb,this.ya,a.parent);Bl(this,a);Cl(this,a);return a};function Y(a,b,c){return b&&b!==ld?b.fa(a,c):null}function Ml(a,b,c){return b&&b!==ld?b.fa(a,c):a.b}function Nl(a,b,c){return b?b===ld?null:b.fa(a,c):a.b}function Ol(a,b,c,d){return b&&c!==Fd?b.fa(a,d):a.b}function Pl(a,b,c){return b?b===Vd?a.g:b===td?a.f:b.fa(a,a.b):c}
function Ql(a,b){this.e=a;this.d=b;this.B={};this.style={};this.k=this.l=null;this.children=[];this.D=this.I=this.f=this.g=!1;this.w=this.A=0;this.u=null;this.na={};this.ga={};this.wa=this.b=!1;a&&a.children.push(this)}function Rl(a,b,c){b=Fl(a,b);c=Fl(a,c);if(!b||!c)throw Error("E_INTERNAL");return F(a.d.d,b,c)}
function Fl(a,b){var c=a.na[b];if(c)return c;var d=a.style[b];d&&(c=d.fa(a.d.d,a.d.d.b));switch(b){case "margin-left-edge":c=Fl(a,"left");break;case "margin-top-edge":c=Fl(a,"top");break;case "margin-right-edge":c=Rl(a,"border-right-edge","margin-right");break;case "margin-bottom-edge":c=Rl(a,"border-bottom-edge","margin-bottom");break;case "border-left-edge":c=Rl(a,"margin-left-edge","margin-left");break;case "border-top-edge":c=Rl(a,"margin-top-edge","margin-top");break;case "border-right-edge":c=
Rl(a,"padding-right-edge","border-right-width");break;case "border-bottom-edge":c=Rl(a,"padding-bottom-edge","border-bottom-width");break;case "padding-left-edge":c=Rl(a,"border-left-edge","border-left-width");break;case "padding-top-edge":c=Rl(a,"border-top-edge","border-top-width");break;case "padding-right-edge":c=Rl(a,"right-edge","padding-right");break;case "padding-bottom-edge":c=Rl(a,"bottom-edge","padding-bottom");break;case "left-edge":c=Rl(a,"padding-left-edge","padding-left");break;case "top-edge":c=
Rl(a,"padding-top-edge","padding-top");break;case "right-edge":c=Rl(a,"left-edge","width");break;case "bottom-edge":c=Rl(a,"top-edge","height")}if(!c){if("extent"==b)d=a.b?"width":"height";else if("measure"==b)d=a.b?"height":"width";else{var e=a.b?bh:ch,d=b,f;for(f in e)d=d.replace(f,e[f])}d!=b&&(c=Fl(a,d))}c&&(a.na[b]=c);return c}
function Sl(a){var b=a.d.d,c=a.style,d=Pl(b,c.enabled,b.g),e=Y(b,c.page,b.b);if(e)var f=new Jc(b,"page-number"),d=Pc(b,d,new Bc(b,e,f));(e=Y(b,c["min-page-width"],b.b))&&(d=Pc(b,d,new Ac(b,new Jc(b,"page-width"),e)));(e=Y(b,c["min-page-height"],b.b))&&(d=Pc(b,d,new Ac(b,new Jc(b,"page-height"),e)));d=a.M(d);c.enabled=new L(d)}Ql.prototype.M=function(a){return a};
Ql.prototype.Cc=function(){var a=this.d.d,b=this.style,c=this.e?this.e.style.width.fa(a,null):null,d=Y(a,b.left,c),e=Y(a,b["margin-left"],c),f=Ol(a,b["border-left-width"],b["border-left-style"],c),g=Ml(a,b["padding-left"],c),k=Y(a,b.width,c),h=Y(a,b["max-width"],c),l=Ml(a,b["padding-right"],c),n=Ol(a,b["border-right-width"],b["border-right-style"],c),p=Y(a,b["margin-right"],c),q=Y(a,b.right,c),r=F(a,f,g),v=F(a,f,l);d&&q&&k?(r=G(a,c,F(a,k,F(a,F(a,d,r),v))),e?p?q=G(a,r,p):p=G(a,r,F(a,q,e)):(r=G(a,r,
q),p?e=G(a,r,p):p=e=Qc(a,r,new B(a,.5)))):(e||(e=a.b),p||(p=a.b),d||q||k||(d=a.b),d||k?d||q?k||q||(k=this.l,this.g=!0):d=a.b:(k=this.l,this.g=!0),r=G(a,c,F(a,F(a,e,r),F(a,p,v))),this.g&&(h||(h=G(a,r,d?d:q)),this.b||!Y(a,b["column-width"],null)&&!Y(a,b["column-count"],null)||(k=h,this.g=!1)),d?k?q||(q=G(a,r,F(a,d,k))):k=G(a,r,F(a,d,q)):d=G(a,r,F(a,q,k)));a=Ml(a,b["snap-width"]||(this.e?this.e.style["snap-width"]:null),c);b.left=new L(d);b["margin-left"]=new L(e);b["border-left-width"]=new L(f);b["padding-left"]=
new L(g);b.width=new L(k);b["max-width"]=new L(h?h:k);b["padding-right"]=new L(l);b["border-right-width"]=new L(n);b["margin-right"]=new L(p);b.right=new L(q);b["snap-width"]=new L(a)};
Ql.prototype.Dc=function(){var a=this.d.d,b=this.style,c=this.e?this.e.style.width.fa(a,null):null,d=this.e?this.e.style.height.fa(a,null):null,e=Y(a,b.top,d),f=Y(a,b["margin-top"],c),g=Ol(a,b["border-top-width"],b["border-top-style"],c),k=Ml(a,b["padding-top"],c),h=Y(a,b.height,d),l=Y(a,b["max-height"],d),n=Ml(a,b["padding-bottom"],c),p=Ol(a,b["border-bottom-width"],b["border-bottom-style"],c),q=Y(a,b["margin-bottom"],c),r=Y(a,b.bottom,d),v=F(a,g,k),y=F(a,p,n);e&&r&&h?(d=G(a,d,F(a,h,F(a,F(a,e,v),
y))),f?q?r=G(a,d,f):q=G(a,d,F(a,r,f)):(d=G(a,d,r),q?f=G(a,d,q):q=f=Qc(a,d,new B(a,.5)))):(f||(f=a.b),q||(q=a.b),e||r||h||(e=a.b),e||h?e||r?h||r||(h=this.k,this.f=!0):e=a.b:(h=this.k,this.f=!0),d=G(a,d,F(a,F(a,f,v),F(a,q,y))),this.f&&(l||(l=G(a,d,e?e:r)),this.b&&(Y(a,b["column-width"],null)||Y(a,b["column-count"],null))&&(h=l,this.f=!1)),e?h?r||(r=G(a,d,F(a,e,h))):h=G(a,d,F(a,r,e)):e=G(a,d,F(a,r,h)));a=Ml(a,b["snap-height"]||(this.e?this.e.style["snap-height"]:null),c);b.top=new L(e);b["margin-top"]=
new L(f);b["border-top-width"]=new L(g);b["padding-top"]=new L(k);b.height=new L(h);b["max-height"]=new L(l?l:h);b["padding-bottom"]=new L(n);b["border-bottom-width"]=new L(p);b["margin-bottom"]=new L(q);b.bottom=new L(r);b["snap-height"]=new L(a)};
function Tl(a){var b=a.d.d,c=a.style;a=Y(b,c[a.b?"height":"width"],null);var d=Y(b,c["column-width"],a),e=Y(b,c["column-count"],null),f;(f=(f=c["column-gap"])&&f!==Gd?f.fa(b,null):null)||(f=new Ic(b,1,"em"));d&&!e&&(e=new Lc(b,"floor",[Rc(b,F(b,a,f),F(b,d,f))]),e=new Lc(b,"max",[b.d,e]));e||(e=b.d);d=G(b,Rc(b,F(b,a,f),e),f);c["column-width"]=new L(d);c["column-count"]=new L(e);c["column-gap"]=new L(f)}function Ul(a,b,c,d){a=a.style[b].fa(a.d.d,null);return lc(a,c,d,{})}
function Vl(a,b){b.qa[a.d.g]=a;var c=a.d.d,d=a.style,e=a.e?Wl(a.e,b):null,e=xi(a.B,b,e,!1);a.b=wi(e,b,a.e?a.e.b:!1);yi(e,d,a.b,function(a,b){return b.value});a.l=new bc(c,function(){return a.A},"autoWidth");a.k=new bc(c,function(){return a.w},"autoHeight");a.Cc();a.Dc();Tl(a);Sl(a)}function Xl(a,b,c){(a=a.style[c])&&(a=Wf(b,a,c));return a}function Z(a,b,c){(a=a.style[c])&&(a=Wf(b,a,c));return id(a,b)}
function Wl(a,b){var c;a:{if(c=a.B["region-id"]){for(var d=[],e=0;e<c.length;e++){var f=c[e].evaluate(b,"");f&&f!==H&&d.push(f)}if(d.length){c=d;break a}}c=null}if(c){d=[];for(e=0;e<c.length;e++)d[e]=c[e].toString();return d}return null}function Yl(a,b,c,d){(a=Xl(a,b,d))&&u(c.d,d,a.toString())}
function Zl(a,b,c){var d=Z(a,b,"left"),e=Z(a,b,"margin-left"),f=Z(a,b,"padding-left"),g=Z(a,b,"border-left-width");a=Z(a,b,"width");Uj(c,d,a);u(c.d,"margin-left",e+"px");u(c.d,"padding-left",f+"px");u(c.d,"border-left-width",g+"px");c.marginLeft=e;c.aa=g;c.j=f}
function $l(a,b,c){var d=Z(a,b,"right"),e=Z(a,b,"snap-height"),f=Z(a,b,"margin-right"),g=Z(a,b,"padding-right");b=Z(a,b,"border-right-width");u(c.d,"margin-right",f+"px");u(c.d,"padding-right",g+"px");u(c.d,"border-right-width",b+"px");c.marginRight=f;c.Fa=b;a.b&&0<e&&(a=d+Rj(c),a=a-Math.floor(a/e)*e,0<a&&(c.Tb=e-a,g+=c.Tb));c.D=g;c.Ub=e}
function am(a,b,c){var d=Z(a,b,"snap-height"),e=Z(a,b,"top"),f=Z(a,b,"margin-top"),g=Z(a,b,"padding-top");b=Z(a,b,"border-top-width");c.top=e;c.marginTop=f;c.ga=b;c.Ga=d;!a.b&&0<d&&(a=e+Oj(c),a=a-Math.floor(a/d)*d,0<a&&(c.qa=d-a,g+=c.qa));c.k=g;u(c.d,"top",e+"px");u(c.d,"margin-top",f+"px");u(c.d,"padding-top",g+"px");u(c.d,"border-top-width",b+"px")}
function bm(a,b,c){var d=Z(a,b,"margin-bottom"),e=Z(a,b,"padding-bottom"),f=Z(a,b,"border-bottom-width");a=Z(a,b,"height")-c.qa;u(c.d,"height",a+"px");u(c.d,"margin-bottom",d+"px");u(c.d,"padding-bottom",e+"px");u(c.d,"border-bottom-width",f+"px");c.height=a-c.qa;c.marginBottom=d;c.wa=f;c.w=e}function cm(a,b,c){a.b?(am(a,b,c),bm(a,b,c)):($l(a,b,c),Zl(a,b,c))}
function dm(a,b,c){u(c.d,"border-top-width","0px");var d=Z(a,b,"max-height");a.I?Tj(c,0,d):(am(a,b,c),d-=c.qa,c.height=d,u(c.d,"height",d+"px"))}function em(a,b,c){u(c.d,"border-left-width","0px");var d=Z(a,b,"max-width");a.D?Uj(c,0,d):($l(a,b,c),d-=c.Tb,c.width=d,a=Z(a,b,"right"),u(c.d,"right",a+"px"),u(c.d,"width",d+"px"))}
var fm="border-left-style border-right-style border-top-style border-bottom-style border-left-color border-right-color border-top-color border-bottom-color outline-style outline-color outline-width overflow visibility".split(" "),gm="border-top-left-radius border-top-right-radius border-bottom-right-radius border-bottom-left-radius border-image-source border-image-slice border-image-width border-image-outset border-image-repeat background-attachment background-color background-image background-repeat background-position background-clip background-origin background-size opacity z-index".split(" "),
hm="color font-family font-size font-style font-weight font-variant line-height letter-spacing text-align text-decoration text-indent text-transform white-space word-spacing".split(" "),im=["transform","transform-origin"];
Ql.prototype.tb=function(a,b){this.e&&this.b==this.e.b||u(b.d,"writing-mode",this.b?"vertical-rl":"horizontal-tb");(this.b?this.g:this.f)?this.b?em(this,a,b):dm(this,a,b):(this.b?$l(this,a,b):am(this,a,b),this.b?Zl(this,a,b):bm(this,a,b));(this.b?this.f:this.g)?this.b?dm(this,a,b):em(this,a,b):cm(this,a,b);for(var c=0;c<fm.length;c++)Yl(this,a,b,fm[c])};function jm(a,b,c){for(var d=0;d<hm.length;d++)Yl(a,b,c,hm[d])}
Ql.prototype.Zb=function(a,b,c,d,e){this.b?this.A=b.e+b.Tb:this.w=b.e+b.qa;var f=(this.b||!d)&&this.f,g=(!this.b||!d)&&this.g,k=null;if(g||f)g&&u(b.d,"width","auto"),f&&u(b.d,"height","auto"),k=(d?d.d:b.d).getBoundingClientRect(),g&&(this.A=Math.ceil(k.right-k.left-b.j-b.aa-b.D-b.Fa),this.b&&(this.A+=b.Tb)),f&&(this.w=k.bottom-k.top-b.k-b.ga-b.w-b.wa,this.b||(this.w+=b.qa));(this.b?this.f:this.g)&&cm(this,a,b);if(this.b?this.g:this.f){if(this.b?this.D:this.I)this.b?$l(this,a,b):am(this,a,b);this.b?
Zl(this,a,b):bm(this,a,b)}if(1<e&&(f=Z(this,a,"column-rule-width"),g=Xl(this,a,"column-rule-style"),k=Xl(this,a,"column-rule-color"),0<f&&g&&g!=Fd&&k!=Rd)){var h=Z(this,a,"column-gap"),l=this.b?b.height:b.width,n=this.b?"border-top":"border-left";for(d=1;d<e;d++){var p=(l+h)*d/e-h/2+b.j-f/2,q=b.height+b.k+b.w,r=b.d.ownerDocument.createElement("div");u(r,"position","absolute");u(r,this.b?"left":"top","0px");u(r,this.b?"top":"left",p+"px");u(r,this.b?"height":"width","0px");u(r,this.b?"width":"height",
q+"px");u(r,n,f+"px "+g.toString()+(k?" "+k.toString():""));b.d.insertBefore(r,b.d.firstChild)}}for(d=0;d<gm.length;d++)Yl(this,a,b,gm[d]);for(d=0;d<im.length;d++)e=b,f=im[d],g=c.g,(k=Xl(this,a,f))&&g.push(new pj(e.d,f,k))};
Ql.prototype.h=function(a,b){var c=this.B,d=this.d.b,e;for(e in d)gh(e)&&hh(c,e,d[e]);if("background-host"==this.d.eb)for(e in b)if(e.match(/^background-/)||"writing-mode"==e)c[e]=b[e];if("layout-host"==this.d.eb)for(e in b)e.match(/^background-/)||"writing-mode"==e||(c[e]=b[e]);hi(a,this.d.ya,null,c);Vl(this,a.d);for(c=0;c<this.d.children.length;c++)this.d.children[c].f(this).h(a,b);a.pop()};
function km(a,b){a.g&&(a.D=Ul(a,"right",a.l,b)||Ul(a,"margin-right",a.l,b)||Ul(a,"border-right-width",a.l,b)||Ul(a,"padding-right",a.l,b));a.f&&(a.I=Ul(a,"top",a.k,b)||Ul(a,"margin-top",a.k,b)||Ul(a,"border-top-width",a.k,b)||Ul(a,"padding-top",a.k,b));for(var c=0;c<a.children.length;c++)km(a.children[c],b)}function lm(a){Ql.call(this,null,a)}t(lm,Ql);lm.prototype.h=function(a,b){Ql.prototype.h.call(this,a,b);this.children.sort(function(a,b){return b.d.j-a.d.j||a.d.h-b.d.h})};
function Hl(a,b){Ql.call(this,a,b);this.u=this}t(Hl,Ql);Hl.prototype.M=function(a){var b=this.d.e;b.J&&(a=Pc(b.d,a,b.J));return a};Hl.prototype.aa=function(){};function Jl(a,b){Ql.call(this,a,b);this.u=a.u}t(Jl,Ql);function Ll(a,b){Ql.call(this,a,b);this.u=a.u}t(Ll,Ql);function mm(a,b,c,d){var e=null;c instanceof cd&&(e=[c]);c instanceof Wc&&(e=c.values);if(e)for(a=a.d.d,c=0;c<e.length;c++)if(e[c]instanceof cd){var f=Yb(e[c].name,"enabled"),f=new Jc(a,f);d&&(f=new rc(a,f));b=Pc(a,b,f)}return b}
Ll.prototype.M=function(a){var b=this.d.d,c=this.style,d=Pl(b,c.required,b.f)!==b.f;if(d||this.f){var e;e=(e=c["flow-from"])?e.fa(b,b.b):new B(b,"body");e=new Lc(b,"has-content",[e]);a=Pc(b,a,e)}a=mm(this,a,c["required-partitions"],!1);a=mm(this,a,c["conflicting-partitions"],!0);d&&(c=(c=this.u.style.enabled)?c.fa(b,null):b.g,c=Pc(b,c,a),this.u.style.enabled=new L(c));return a};Ll.prototype.tb=function(a,b,c){u(b.d,"overflow","hidden");Ql.prototype.tb.call(this,a,b,c)};
function nm(a,b,c,d){tf.call(this,a,b,!1);this.target=c;this.b=d}t(nm,uf);nm.prototype.Ka=function(a,b,c){Rg(this.b,a,b,c,this)};nm.prototype.lc=function(a,b){vf(this,"E_INVALID_PROPERTY "+a+": "+b.toString())};nm.prototype.Eb=function(a,b){vf(this,"E_INVALID_PROPERTY_VALUE "+a+": "+b.toString())};nm.prototype.fb=function(a,b,c){this.target.b[a]=new V(b,c?50331648:67108864)};function om(a,b,c,d){nm.call(this,a,b,c,d)}t(om,nm);
function pm(a,b,c,d){nm.call(this,a,b,c,d);c.b.width=new V(Wd,0);c.b.height=new V(Wd,0)}t(pm,nm);pm.prototype.Mb=function(a,b,c){a=new Kl(this.e,a,b,c,this.target);sf(this.Z,new om(this.e,this.Z,a,this.b))};pm.prototype.Lb=function(a,b,c){a=new Il(this.e,a,b,c,this.target);a=new pm(this.e,this.Z,a,this.b);sf(this.Z,a)};function qm(a,b,c,d){nm.call(this,a,b,c,d)}t(qm,nm);qm.prototype.Mb=function(a,b,c){a=new Kl(this.e,a,b,c,this.target);sf(this.Z,new om(this.e,this.Z,a,this.b))};
qm.prototype.Lb=function(a,b,c){a=new Il(this.e,a,b,c,this.target);a=new pm(this.e,this.Z,a,this.b);sf(this.Z,a)};function hl(a,b,c){b=b?"vertical-rl":"horizontal-tb";if("top"===a||"bottom"===a)a=gj(a,b,c||null,kj);"block-start"===a&&(a="inline-start");"block-end"===a&&(a="inline-end");if("inline-start"===a||"inline-end"===a){c=gj(a,b,c||null,jj);a:{var d=lj[b];if(!d)throw Error("unknown writing-mode: "+b);for(b=0;b<d.length;b++)if(d[b].H===c){b=d[b].G;break a}b=c}"line-left"===b?a="left":"line-right"===b&&(a="right")}"left"!==a&&"right"!==a&&(w("Invalid float value: "+a+". Fallback to left."),a="left");return a}
function rm(a,b){this.d=Gj(a);this.b=b}function sm(a,b,c){this.e=a;this.g=b;this.f=c;this.d=[];this.b=[]}
function el(a,b,c){b.parentNode&&b.parentNode.removeChild(b);u(b,"float","none");u(b,"position","absolute");var d=a.g.toString(),e=a.f.toString(),f=gj(c,d,e||null,jj),g=gj(c,d,e||null,kj);u(b,f,"0");switch(g){case "inline-start":case "inline-end":d=gj("block-start",d,e||null,jj);u(b,d,"0");break;case "block-start":case "block-end":c=gj("inline-start",d,e||null,jj);u(b,c,"0");d=gj("max-inline-size",d,e||null,jj);Aa(b,d)||u(b,d,"100%");break;default:throw Error("unknown float direction: "+c);}a.e().appendChild(b)}
function fl(a,b,c){b=Ij(b);for(var d=0;d<a.d.length;d++){var e=a.d[d];if(tm(c,b,Ij(e.d)))return e}return null}function gl(a,b,c){var d=M("tryToAddFloat");b=new rm(b,c);a.d.push(b);a.b.push(b);Q(d,b);return O(d)}function um(a){return a.b.map(function(a){a=a.b;return new ie([new de(a.W,a.T),new de(a.U,a.T),new de(a.U,a.P),new de(a.W,a.P)])})};var vm={"text-indent":"0px","margin-top":"0px","padding-top":"0px","border-top-width":"0px","border-top-style":"none","border-top-color":"transparent"},wm={"text-indent":"0px","margin-right":"0px","padding-right":"0px","border-right-width":"0px","border-right-style":"none","border-right-color":"transparent"},xm={};
function ym(a){a.addEventListener("load",function(){a.contentWindow.navigator.epubReadingSystem={name:"adapt",version:"0.1",layoutStyle:"paginated",hasFeature:function(a){switch(a){case "mouse-events":return!0}return!1}}},!1)}var zm=(new DOMParser).parseFromString('<root xmlns="http://www.pyroxy.com/ns/shadow"/>',"text/xml"),Am="footnote-marker first-5-lines first-4-lines first-3-lines first-2-lines first-line first-letter before  after".split(" ");
function Bm(a,b,c,d){this.style=b;this.f=a;this.b=c;this.d=d;this.e={}}
Bm.prototype.g=function(a){var b=a.getAttribute("class")||"";this.b&&b&&b.match(/after$/)&&(this.style=this.b.g(this.f,!0),this.b=null);var c=this.style._pseudos[b]||{};if(!this.e[b]){this.e[b]=!0;var d=c.content;d&&(d=d.evaluate(this.d),Wj(d)&&d.S(new Vj(a,this.d)))}if(b.match(/^first-/)&&!c["x-first-pseudo"]){a=1;var e;"first-letter"==b?a=0:null!=(e=b.match(/^first-([0-9]+)-lines$/))&&(a=e[1]-0);c["x-first-pseudo"]=new V(new ed(a),0)}return c};
function Cm(a,b,c,d,e,f,g,k,h,l,n,p,q){this.A=a;this.d=b;this.viewport=c;this.u=c.b;this.k=d;this.D=e;this.$=f;this.B=g;this.l=k;this.I=h;this.e=l;this.h=n;this.w=p;this.g=q;this.M=this.b=null;this.j=!1;this.X=null;this.ba=0;this.f=null}Cm.prototype.clone=function(){return new Cm(this.A,this.d,this.viewport,this.k,this.D,this.$,this.B,this.l,this.I,this.e,this.h,this.w,this.g)};
function Dm(a,b,c,d,e,f){var g=M("createRefShadow");a.$.j.load(b).then(function(k){if(k){var h=Ri(k,b);if(h){var l=a.I,n=l.D[k.url];n||(n=l.style.h.b[k.url],n=new ek(k,n.d,n.g,new fc(0,l.u(),l.l(),l.g),l.e,n.j,l.j),l.D[k.url]=n);f=new Bj(d,h,k,e,f,c,n)}}Q(g,f)});return O(g)}
function Em(a,b,c,d,e,f,g,k){var h=M("createShadows"),l=e.template,n;l instanceof gd?n=Dm(a,l.url,2,b,k,null):n=N(null);n.then(function(l){var n=null;if("http://www.pyroxy.com/ns/shadow"==b.namespaceURI&&"include"==b.localName){var r=b.getAttribute("href"),v=null;r?v=k?k.$:a.$:k&&(r="http://www.w3.org/1999/xhtml"==k.Z.namespaceURI?k.Z.getAttribute("href"):k.Z.getAttributeNS("http://www.w3.org/1999/xlink","href"),v=k.Kc?k.Kc.$:a.$);r&&(r=fa(r,v.url),n=Dm(a,r,3,b,k,l))}null==n&&(n=N(l));n.then(function(l){var n;
if(n=d._pseudos){for(var p=zm.createElementNS("http://www.pyroxy.com/ns/shadow","root"),q=p,r=0;r<Am.length;r++){var v=Am[r],mb;if(v){if(!n[v])continue;if(!("footnote-marker"!=v||c&&a.j))continue;if(v.match(/^first-/)&&(mb=e.display,!mb||mb===yd))continue;mb=zm.createElementNS("http://www.w3.org/1999/xhtml","span");mb.setAttribute("class",v)}else mb=zm.createElementNS("http://www.pyroxy.com/ns/shadow","content");q.appendChild(mb);v.match(/^first-/)&&(q=mb)}l=new Bj(b,p,null,k,l,2,new Bm(b,d,f,g))}Q(h,
l)})});return O(h)}function Ck(a,b,c){a.M=b;a.j=c}function Fm(a,b,c,d){var e=a.d;c=xi(c,e,a.D,a.j);b=wi(c,e,b);yi(c,d,b,function(b,c){var d=c.evaluate(e,b);if("font-family"==b){var h=a.B;if(d instanceof Wc){for(var d=d.values,l=[],n=0;n<d.length;n++){var p=d[n],q=h.b[p.stringValue()];q&&l.push(J(q));l.push(p)}d=new Wc(l)}else d=(h=h.b[d.stringValue()])?new Wc([J(h),d]):d}return d});return b}
function Gm(a,b){for(var c=a.b.X,d=[],e=a.b.ca,f=-1;c&&1==c.nodeType;){var g=e&&e.root==c;if(!g||2==e.type){var k=(e?e.b:a.k).g(c,!1);d.push(k)}g?(c=e.Z,e=e.Kc):(c=c.parentNode,f++)}c=hc(a.d,"em",0===f);c={"font-size":new V(new K(c,"px"),0)};e=new lh(c,a.d);for(f=d.length-1;0<=f;--f){var g=d[f],k=[],h;for(h in g)Tg[h]&&k.push(h);k.sort(be);for(var l=0;l<k.length;l++){var n=k[l];e.b=n;c[n]=g[n].xc(e)}}for(var p in b)Tg[p]||(c[p]=b[p]);return c}
var Hm={a:"a",sub:"sub",sup:"sup",table:"table",tr:"tr",td:"td",th:"th",code:"code",body:"div",p:"p",v:"p",date:"p",emphasis:"em",strong:"strong",style:"span",strikethrough:"del"};function Im(a,b){b=fa(b,a.$.url);return a.w[b]||b}
function Jm(a,b){var c=!0,d=M("createElementView"),e=a.X,f=a.b.ca?a.b.ca.b:a.k,g=f.g(e,!1),k={};a.b.parent||(g=Gm(a,g));a.b.g=Fm(a,a.b.g,g,k);k.direction&&(a.b.D=k.direction.toString());var h=k["flow-into"];if(h&&h.toString()!=a.A)return Q(d,!1),O(d);var l=k.display;if(l===Fd)return Q(d,!1),O(d);Em(a,e,null==a.b.parent,g,k,f,a.d,a.b.ca).then(function(f){a.b.va=f;var g=a.b.parent&&a.b.parent.k;f=k["float-reference"];var h=k["float"],r=k.clear;if(k.position===jd||k.position===Jd)a.b.k=!0,h=null;g&&
(r=null,h!==ud&&(h=null));g=h===Cd||h===Kd||h===Qd||h===rd||h===Ad||h===zd||h===pd||h===od||h===ud;h&&(delete k["float"],h===ud&&(a.j?(g=!1,k.display=nd):k.display=yd),a.b.k=!0);r&&(r===xd&&a.b.parent&&a.b.parent.w&&(r=J(a.b.parent.w)),r===Cd||r===Kd||r===qd)&&(delete k.clear,k.display&&k.display!=yd&&(a.b.w=r.toString()));k.overflow===vd&&(a.b.k=!0);var v=l===Dd&&k["ua-list-item-count"];g||l===Od||k["break-inside"]===md||k["page-break-inside"]===md?a.b.h++:l===Pd&&(a.b.h+=10);a.b.d=!g&&!l||l===yd;
a.b.j=g?h.toString():null;a.b.M=f?f.toString():null;if(!a.b.d){if(f=k["break-after"]||k["page-break-after"])a.b.B=f.toString();if(f=k["break-before"]||k["page-break-before"])a.b.u=f.toString()}if(f=k["x-first-pseudo"])a.b.f=new Cj(a.b.parent?a.b.parent.f:null,f.C);if(f=k["white-space"])switch(f.toString()){case "normal":case "nowrap":a.b.A=0;break;case "pre-line":a.b.A=1;break;case "pre":case "pre-wrap":a.b.A=2}var y=!1,I=null,W=[],P=e.namespaceURI,E=e.localName;if("http://www.w3.org/1999/xhtml"==
P)"html"==E||"body"==E||"script"==E||"link"==E||"meta"==E?E="div":"vide_"==E?E="video":"audi_"==E?E="audio":"object"==E&&(y=!!a.h);else if("http://www.idpf.org/2007/ops"==P)E="span",P="http://www.w3.org/1999/xhtml";else if("http://www.gribuser.ru/xml/fictionbook/2.0"==P){P="http://www.w3.org/1999/xhtml";if("image"==E){if(E="div",(f=e.getAttributeNS("http://www.w3.org/1999/xlink","href"))&&"#"==f.charAt(0)&&(f=Ri(a.$,f)))I=a.createElement(P,"img"),f="data:"+(f.getAttribute("content-type")||"image/jpeg")+
";base64,"+f.textContent.replace(/[ \t\n\t]/g,""),W.push(fg(I,f))}else E=Hm[E];E||(E=a.b.d?"span":"div")}else if("http://www.daisy.org/z3986/2005/ncx/"==P)if(P="http://www.w3.org/1999/xhtml","ncx"==E||"navPoint"==E)E="div";else if("navLabel"==E){if(E="span",h=e.parentNode){f=null;for(h=h.firstChild;h;h=h.nextSibling)if(1==h.nodeType&&(r=h,"http://www.daisy.org/z3986/2005/ncx/"==r.namespaceURI&&"content"==r.localName)){f=r.getAttribute("src");break}f&&(E="a",e=e.ownerDocument.createElementNS(P,"a"),
e.setAttribute("href",f))}}else E="span";else"http://www.pyroxy.com/ns/shadow"==P?(P="http://www.w3.org/1999/xhtml",E=a.b.d?"span":"div"):y=!!a.h;v?b?E="li":(E="div",l=nd,k.display=l):"body"==E||"li"==E?E="div":"q"==E?E="span":"a"==E&&(f=k["hyperlink-processing"])&&"normal"!=f.toString()&&(E="span");k.behavior&&"none"!=k.behavior.toString()&&a.h&&(y=!0);var Ea;y?Ea=a.h(e,a.b.parent?a.b.parent.b:null,k):Ea=N(null);Ea.then(function(f){f?y&&(c="true"==f.getAttribute("data-adapt-process-children")):f=
a.createElement(P,E);"a"==E&&f.addEventListener("click",a.e.A,!1);I&&(cl(a,a.b,"inner",I),f.appendChild(I));"iframe"==f.localName&&"http://www.w3.org/1999/xhtml"==f.namespaceURI&&ym(f);if("http://www.gribuser.ru/xml/fictionbook/2.0"!=e.namespaceURI||"td"==E){for(var g=e.attributes,h=g.length,l=null,n=0;n<h;n++){var p=g[n],r=p.namespaceURI,q=p.localName,p=p.nodeValue;if(r)if("http://www.w3.org/2000/xmlns/"==r)continue;else"http://www.w3.org/1999/xlink"==r&&"href"==q&&(p=Im(a,p));else{if(q.match(/^on/))continue;
if("style"==q)continue;if("id"==q){vj(a.e,f,p);continue}if("src"==q||"href"==q||"poster"==q)p=Im(a,p)}if(r){var Ea=xm[r];Ea&&(q=Ea+":"+q)}"src"!=q||r||"img"!=E||"http://www.w3.org/1999/xhtml"!=P?"href"==q&&"image"==E&&"http://www.w3.org/2000/svg"==P&&"http://www.w3.org/1999/xlink"==r?a.e.e.push(fg(f,p)):r?f.setAttributeNS(r,q,p):f.setAttribute(q,p):l=p}l&&(g=fg(f,l),h=k.width,l=k.height,h&&h!==ld&&l&&l!==ld?a.e.e.push(g):W.push(g))}delete k.content;(g=k["list-style-image"])&&g instanceof gd&&(g=g.url,
W.push(fg(new Image,g)));Km(a,f,k);g=k.widows;h=k.orphans;if(g||h){if(a.b.parent){a.b.l={};for(var Xd in a.b.parent.l)a.b.l[Xd]=a.b.parent.l[Xd]}g instanceof ed&&(a.b.l.widows=g.C);h instanceof ed&&(a.b.l.orphans=h.C)}if(!b&&!a.b.d){Xd=a.b.g?wm:vm;for(var Rk in Xd)u(f,Rk,Xd[Rk])}v&&f.setAttribute("value",k["ua-list-item-count"].stringValue());a.f=f;W.length?eg(W).then(function(){Q(d,c)}):$e().then(function(){Q(d,c)})})});return O(d)}
function Lm(a,b){var c=M("createNodeView"),d,e=!0;1==a.X.nodeType?d=Jm(a,b):(8==a.X.nodeType?a.f=null:a.f=document.createTextNode(a.X.textContent.substr(a.ba||0)),d=N(!0));d.then(function(b){e=b;(a.b.b=a.f)&&(b=a.b.parent?a.b.parent.b:a.M)&&b.appendChild(a.f);Q(c,e)});return O(c)}function Dk(a,b,c){(a.b=b)?(a.X=b.X,a.ba=b.ba):(a.X=null,a.ba=-1);a.f=null;return a.b?Lm(a,c):N(!0)}
function Mm(a){if(null==a.ca||"content"!=a.X.localName||"http://www.pyroxy.com/ns/shadow"!=a.X.namespaceURI)return a;var b=a.da,c=a.ca,d=a.parent,e,f;c.ed?(f=c.ed,e=c.root,c=c.type,2==c&&(e=e.firstChild)):(f=c.Kc,e=c.Z.firstChild,c=2);var g=a.X.nextSibling;g?(a.X=g,Ej(a)):a.oa?a=a.oa:e?a=null:(a=a.parent.modify(),a.K=!0);if(e)return b=new Dj(e,d,b),b.ca=f,b.La=c,b.oa=a,b;a.da=b;return a}
function Nm(a){var b=a.da+1;if(a.K){if(!a.parent)return null;if(3!=a.La){var c=a.X.nextSibling;if(c)return a=a.modify(),a.da=b,a.X=c,Ej(a),Mm(a)}if(a.oa)return a=a.oa.modify(),a.da=b,a;a=a.parent.modify()}else{if(a.va&&(c=a.va.root,2==a.va.type&&(c=c.firstChild),c))return b=new Dj(c,a,b),b.ca=a.va,b.La=a.va.type,Mm(b);if(c=a.X.firstChild)return Mm(new Dj(c,a,b));1!=a.X.nodeType&&(b+=a.X.textContent.length-1-a.ba);a=a.modify()}a.da=b;a.K=!0;return a}
function Ik(a,b){b=Nm(b);if(!b||b.K)return N(b);var c=M("nextInTree");Dk(a,b,!0).then(function(a){b.b&&a||(b=b.modify(),b.K=!0,b.b||(b.d=!0));Q(c,b)});return O(c)}function Om(a,b){if(b instanceof Wc)for(var c=b.values,d=0;d<c.length;d++)Om(a,c[d]);else b instanceof gd&&(c=b.url,a.e.e.push(fg(new Image,c)))}
function Km(a,b,c){var d=c["background-image"];d&&Om(a,d);for(var e in c)d=c[e],!oj[e]||"position"==e&&d!==Jd?(d.Fc()&&"rem"===d.ja&&(d=new K(id(d,a.d),"px")),u(b,e,d.toString())):a.e.g.push(new pj(b,e,d))}function cl(a,b,c,d){if(!b.K){var e=(b.ca?b.ca.b:a.k).g(a.X,!1);if(e=e._pseudos)if(e=e[c])c={},b.g=Fm(a,b.g,e,c),b=c.content,Wj(b)&&(b.S(new Vj(d,a.d)),delete c.content),Km(a,d,c)}}
function Gk(a,b,c){var d=M("peelOff"),e=b.f,f=b.ba,g=b.K;if(0<c)b.b.textContent=b.b.textContent.substr(0,c),f+=c;else if(!g&&b.b&&0==f){var k=b.b.parentNode;k&&k.removeChild(b.b)}for(var h=b.da+c,l=[];b.f===e;)l.push(b),b=b.parent;var n=l.pop(),p=n.oa;af(function(){for(;0<l.length;){n=l.pop();b=new Dj(n.X,b,h);0==l.length&&(b.ba=f,b.K=g);b.La=n.La;b.ca=n.ca;b.va=n.va;b.oa=n.oa?n.oa:p;p=null;var c=Dk(a,b,!1);if(c.za())return c}return N(!1)}).then(function(){Q(d,b)});return O(d)}
Cm.prototype.createElement=function(a,b){return"http://www.w3.org/1999/xhtml"==a?this.u.createElement(b):this.u.createElementNS(a,b)};function Xk(a,b,c){var d={},e=a.l._pseudos;b=Fm(a,b,a.l,d);if(e&&e.before){var f={},g=a.createElement("http://www.w3.org/1999/xhtml","span");c.appendChild(g);Fm(a,b,e.before,f);delete f.content;Km(a,g,f)}delete d.content;Km(a,c,d);return b}
function tm(a,b,c){return b.ba===c.ba&&b.K==c.K&&b.ia.length===c.ia.length&&b.ia.every(function(a,b){var f;f=c.ia[b];if(a.ca)if(f.ca){var g=1===a.ea.nodeType?a.ea:a.ea.parentElement,k=1===f.ea.nodeType?f.ea:f.ea.parentElement;f=a.ca.Z===f.ca.Z&&(g.getAttribute("class")||"")===(k.getAttribute("class")||"")}else f=!1;else f=a.ea===f.ea;return f}.bind(a))}function Pm(a){this.b=a}function rk(a){return a.getClientRects()}
function Qm(a,b,c,d,e){this.f=a;this.fontSize=b;this.b=a.document;this.root=c||this.b.body;b=this.root.firstElementChild;b||(b=this.b.createElement("div"),this.root.appendChild(b));c=b.firstElementChild;c||(c=this.b.createElement("div"),b.appendChild(c));this.e=b;this.d=c;b=(new Pm(a)).b.getComputedStyle(this.root,null);this.width=d||parseFloat(b.width)||a.innerWidth;this.height=e||parseFloat(b.height)||a.innerHeight}
Qm.prototype.zoom=function(a,b,c){u(this.e,"width",a*c+"px");u(this.e,"height",b*c+"px");u(this.d,"width",a+"px");u(this.d,"height",b+"px");u(this.d,"transform","scale("+c+")")};function Rm(a,b){this.e(a,"end",b)}function Sm(a,b){this.e(a,"start",b)}function Tm(a,b,c){c||(c=this.g.now());var d=this.f[a];d||(d=this.f[a]=[]);var e;for(a=d.length-1;0<=a&&(!(e=d[a])||e[b]);a--)e=null;e||(e={},d.push(e));e[b]=c}function Um(){}function Vm(a){this.g=a;this.f={};this.registerEndTiming=this.d=this.registerStartTiming=this.b=this.e=Um}
Vm.prototype.h=function(){var a=this.f,b="";Object.keys(a).forEach(function(c){for(var d=a[c],e=d.length,f=0;f<e;f++){var g=d[f];b+=c;1<e&&(b+="("+f+")");b+=" => start: "+g.start+", end: "+g.end+", duration: "+(g.end-g.start)+"\n"}});window&&window.console&&(window.console.debug?window.console.debug(b):window.console.log&&window.console.log(b))};Vm.prototype.j=function(){this.registerEndTiming=this.d=this.registerStartTiming=this.b=this.e=Um};
Vm.prototype.k=function(){this.e=Tm;this.registerStartTiming=this.b=Sm;this.registerEndTiming=this.d=Rm};var Wm={now:Date.now},Xm,Ym=Xm=new Vm(window&&window.performance||Wm);Tm.call(Ym,"load_vivliostyle","start",void 0);ca("vivliostyle.profile.profiler",Ym);Vm.prototype.printTimings=Vm.prototype.h;Vm.prototype.disable=Vm.prototype.j;Vm.prototype.enable=Vm.prototype.k;function Zm(a,b,c){function d(c){return a.b.getComputedStyle(b,null).getPropertyValue(c)}function e(){u(b,"display","block");u(b,"position","static");return d(W)}function f(){u(b,"display","inline-block");u(v,W,"99999999px");var a=d(W);u(v,W,"");return a}function g(){u(b,"display","inline-block");u(v,W,"0");var a=d(W);u(v,W,"");return a}function k(){var a=e(),b=g(),c=parseFloat(a);if(c<=parseFloat(b))return b;b=f();return c<=parseFloat(b)?a:b}function h(){throw Error("Getting fill-available block size is not implemented");
}var l=b.style.display,n=b.style.position,p=b.style.width,q=b.style.height,r=b.parentNode,v=b.ownerDocument.createElement("div");u(v,"position",n);r.insertBefore(v,b);v.appendChild(b);u(b,"width","auto");u(b,"height","auto");var y=d(za["writing-mode"])||d("writing-mode"),I="vertical-rl"===y||"tb-rl"===y||"vertical-lr"===y||"tb-lr"===y,W=I?"height":"width",P=I?"width":"height",E={};c.forEach(function(a){var c;switch(a){case "fill-available inline size":c=e();break;case "max-content inline size":c=
f();break;case "min-content inline size":c=g();break;case "fit-content inline size":c=k();break;case "fill-available block size":c=h();break;case "max-content block size":case "min-content block size":case "fit-content block size":c=d(P);break;case "fill-available width":c=I?h():e();break;case "fill-available height":c=I?e():h();break;case "max-content width":c=I?d(P):f();break;case "max-content height":c=I?f():d(P);break;case "min-content width":c=I?d(P):g();break;case "min-content height":c=I?g():
d(P);break;case "fit-content width":c=I?d(P):k();break;case "fit-content height":c=I?k():d(P)}E[a]=parseFloat(c);u(b,"position",n);u(b,"display",l)});u(b,"width",p);u(b,"height",q);r.insertBefore(b,v);r.removeChild(v);return E};function $m(a){var b=a["writing-mode"],b=b&&b.value;a=(a=a.direction)&&a.value;return b===Sd||b!==Td&&a!==Nd?"ltr":"rtl"}
var an={a5:{width:new K(148,"mm"),height:new K(210,"mm")},a4:{width:new K(210,"mm"),height:new K(297,"mm")},a3:{width:new K(297,"mm"),height:new K(420,"mm")},b5:{width:new K(176,"mm"),height:new K(250,"mm")},b4:{width:new K(250,"mm"),height:new K(353,"mm")},"jis-b5":{width:new K(182,"mm"),height:new K(257,"mm")},"jis-b4":{width:new K(257,"mm"),height:new K(364,"mm")},letter:{width:new K(8.5,"in"),height:new K(11,"in")},legal:{width:new K(8.5,"in"),height:new K(14,"in")},ledger:{width:new K(11,"in"),
height:new K(17,"in")}},bn={width:Yd,height:Zd};function cn(a){if((a=a.size)&&a.value!==ld){var b=a.value;b.ad()?(a=b.values[0],b=b.values[1]):(a=b,b=null);return a.Fc()?{width:a,height:b||a}:(a=an[a.name.toLowerCase()])?b&&b===Bd?{width:a.height,height:a.width}:{width:a.width,height:a.height}:bn}return bn}
var dn=function(){var a={width:!0,height:!0,"block-size":!0,"inline-size":!0,margin:!0,padding:!0,border:!0,outline:!0,"outline-width":!0,"outline-style":!0,"outline-color":!0};"left right top bottom before after start end block-start block-end inline-start inline-end".split(" ").forEach(function(b){a["margin-"+b]=!0;a["padding-"+b]=!0;a["border-"+b+"-width"]=!0;a["border-"+b+"-style"]=!0;a["border-"+b+"-color"]=!0});return a}(),en={"top-left-corner":{N:1,ua:!0,ra:!1,sa:!0,ta:!0,ha:null},"top-left":{N:2,
ua:!0,ra:!1,sa:!1,ta:!1,ha:"start"},"top-center":{N:3,ua:!0,ra:!1,sa:!1,ta:!1,ha:"center"},"top-right":{N:4,ua:!0,ra:!1,sa:!1,ta:!1,ha:"end"},"top-right-corner":{N:5,ua:!0,ra:!1,sa:!1,ta:!0,ha:null},"right-top":{N:6,ua:!1,ra:!1,sa:!1,ta:!0,ha:"start"},"right-middle":{N:7,ua:!1,ra:!1,sa:!1,ta:!0,ha:"center"},"right-bottom":{N:8,ua:!1,ra:!1,sa:!1,ta:!0,ha:"end"},"bottom-right-corner":{N:9,ua:!1,ra:!0,sa:!1,ta:!0,ha:null},"bottom-right":{N:10,ua:!1,ra:!0,sa:!1,ta:!1,ha:"end"},"bottom-center":{N:11,ua:!1,
ra:!0,sa:!1,ta:!1,ha:"center"},"bottom-left":{N:12,ua:!1,ra:!0,sa:!1,ta:!1,ha:"start"},"bottom-left-corner":{N:13,ua:!1,ra:!0,sa:!0,ta:!1,ha:null},"left-bottom":{N:14,ua:!1,ra:!1,sa:!0,ta:!1,ha:"end"},"left-middle":{N:15,ua:!1,ra:!1,sa:!0,ta:!1,ha:"center"},"left-top":{N:16,ua:!1,ra:!1,sa:!0,ta:!1,ha:"start"}},fn=Object.keys(en).sort(function(a,b){return en[a].N-en[b].N});
function gn(a,b,c){Gl.call(this,a,null,"vivliostyle-page-rule-master",[],b,null,0);a=cn(c);new hn(this.d,this,c,a);this.u={};jn(this,c);this.b.position=new V(Jd,0);this.b.width=new V(a.width,0);this.b.height=new V(a.height,0);for(var d in c)dn[d]||"background-clip"===d||(this.b[d]=c[d])}t(gn,Gl);function jn(a,b){var c=b._marginBoxes;c&&fn.forEach(function(d){c[d]&&(a.u[d]=new kn(a.d,a,d,b))})}gn.prototype.f=function(a){return new ln(a,this)};
function hn(a,b,c,d){Kl.call(this,a,null,null,[],b);this.w=d;this.b["z-index"]=new V(new ed(0),0);this.b["flow-from"]=new V(J("body"),0);this.b.position=new V(jd,0);this.b.overflow=new V(Ud,0);for(var e in dn)dn.hasOwnProperty(e)&&(this.b[e]=c[e])}t(hn,Kl);hn.prototype.f=function(a){return new mn(a,this)};
function kn(a,b,c,d){Kl.call(this,a,null,null,[],b);this.l=c;a=d._marginBoxes[this.l];for(var e in d)if(b=d[e],c=a[e],Tg[e]||c&&c.value===xd)this.b[e]=b;for(e in a)Object.prototype.hasOwnProperty.call(a,e)&&(b=a[e])&&b.value!==xd&&(this.b[e]=b)}t(kn,Kl);kn.prototype.f=function(a){return new nn(a,this)};function ln(a,b){Hl.call(this,a,b);this.j=null;this.qa={}}t(ln,Hl);
ln.prototype.h=function(a,b){var c=this.B,d;for(d in b)if(Object.prototype.hasOwnProperty.call(b,d))switch(d){case "writing-mode":case "direction":c[d]=b[d]}Hl.prototype.h.call(this,a,b)};ln.prototype.Cc=function(){var a=this.style;a.left=$d;a["margin-left"]=$d;a["border-left-width"]=$d;a["padding-left"]=$d;a["padding-right"]=$d;a["border-right-width"]=$d;a["margin-right"]=$d;a.right=$d};
ln.prototype.Dc=function(){var a=this.style;a.top=$d;a["margin-top"]=$d;a["border-top-width"]=$d;a["padding-top"]=$d;a["padding-bottom"]=$d;a["border-bottom-width"]=$d;a["margin-bottom"]=$d;a.bottom=$d};ln.prototype.aa=function(a,b,c){b=b.l;var d={start:this.j.marginLeft,end:this.j.marginRight,Y:this.j.rb},e={start:this.j.marginTop,end:this.j.marginBottom,Y:this.j.qb};on(this,b.top,!0,d,a,c);on(this,b.bottom,!0,d,a,c);on(this,b.left,!1,e,a,c);on(this,b.right,!1,e,a,c)};
function pn(a,b,c,d,e){this.L=a;this.l=e;this.g=c;this.k=!Y(d,b[c?"width":"height"],new Ic(d,0,"px"));this.h=null}pn.prototype.b=function(){return this.k};function qn(a){a.h||(a.h=Zm(a.l,a.L.d,a.g?["max-content width","min-content width"]:["max-content height","min-content height"]));return a.h}pn.prototype.e=function(){var a=qn(this);return this.g?Qj(this.L)+a["max-content width"]+Rj(this.L):Oj(this.L)+a["max-content height"]+Pj(this.L)};
pn.prototype.f=function(){var a=qn(this);return this.g?Qj(this.L)+a["min-content width"]+Rj(this.L):Oj(this.L)+a["min-content height"]+Pj(this.L)};pn.prototype.d=function(){return this.g?Qj(this.L)+this.L.width+Rj(this.L):Oj(this.L)+this.L.height+Pj(this.L)};function rn(a){this.g=a}rn.prototype.b=function(){return this.g.some(function(a){return a.b()})};rn.prototype.e=function(){var a=this.g.map(function(a){return a.e()});return Math.max.apply(null,a)*a.length};
rn.prototype.f=function(){var a=this.g.map(function(a){return a.f()});return Math.max.apply(null,a)*a.length};rn.prototype.d=function(){var a=this.g.map(function(a){return a.d()});return Math.max.apply(null,a)*a.length};function sn(a,b,c,d,e,f){pn.call(this,a,b,c,d,e);this.j=f}t(sn,pn);sn.prototype.b=function(){return!1};sn.prototype.e=function(){return this.d()};sn.prototype.f=function(){return this.d()};sn.prototype.d=function(){return this.g?Qj(this.L)+this.j+Rj(this.L):Oj(this.L)+this.j+Pj(this.L)};
function on(a,b,c,d,e,f){var g=a.d.d,k={},h={},l={},n;for(n in b){var p=en[n];if(p){var q=b[n],r=a.qa[n],v=new pn(q,r.style,c,g,f);k[p.ha]=q;h[p.ha]=r;l[p.ha]=v}}a=d.start.evaluate(e);d.end.evaluate(e);b=d.Y.evaluate(e);var y=tn(l,b),I=!1,W={};Object.keys(k).forEach(function(a){var b=Y(g,h[a].style[c?"max-width":"max-height"],d.Y);b&&(b=b.evaluate(e),y[a]>b&&(b=l[a]=new sn(k[a],h[a].style,c,g,f,b),W[a]=b.d(),I=!0))});I&&(y=tn(l,b),I=!1,["start","center","end"].forEach(function(a){y[a]=W[a]||y[a]}));
var P={};Object.keys(k).forEach(function(a){var b=Y(g,h[a].style[c?"min-width":"min-height"],d.Y);b&&(b=b.evaluate(e),y[a]<b&&(b=l[a]=new sn(k[a],h[a].style,c,g,f,b),P[a]=b.d(),I=!0))});I&&(y=tn(l,b),["start","center","end"].forEach(function(a){y[a]=P[a]||y[a]}));var E=a+b,Ea=a+(a+b);["start","center","end"].forEach(function(a){var b=y[a];if(b){var d=k[a],e=0;switch(a){case "start":e=c?d.left:d.top;break;case "center":e=(Ea-b)/2;break;case "end":e=E-b}c?Uj(d,e,b-Qj(d)-Rj(d)):Tj(d,e,b-Oj(d)-Pj(d))}})}
function tn(a,b){var c=a.start,d=a.center,e=a.end,f={};if(d){var g=[c,e].filter(function(a){return a}),g=un(d,g.length?new rn(g):null,b);g.Na&&(f.center=g.Na);d=g.Na||d.d();d=(b-d)/2;c&&c.b()&&(f.start=d);e&&e.b()&&(f.end=d)}else c=un(c,e,b),c.Na&&(f.start=c.Na),c.Qb&&(f.end=c.Qb);return f}
function un(a,b,c){var d={Na:null,Qb:null};if(a&&b)if(a.b()&&b.b()){var e=a.e(),f=b.e();0<e&&0<f?(f=e+f,f<c?d.Na=c*e/f:(a=a.f(),b=b.f(),b=a+b,b<c?d.Na=a+(c-b)*(e-a)/(f-b):0<b&&(d.Na=c*a/b)),0<d.Na&&(d.Qb=c-d.Na)):0<e?d.Na=c:0<f&&(d.Qb=c)}else a.b()?d.Na=Math.max(c-b.d(),0):b.b()&&(d.Qb=Math.max(c-a.d(),0));else a?a.b()&&(d.Na=c):b&&b.b()&&(d.Qb=c);return d}function mn(a,b){Ll.call(this,a,b);this.marginLeft=this.marginBottom=this.marginRight=this.marginTop=this.qb=this.rb=null}t(mn,Ll);
mn.prototype.h=function(a,b){var c=this.B,d;for(d in b)Object.prototype.hasOwnProperty.call(b,d)&&(d.match(/^column.*$/)||d.match(/^background-/))&&(c[d]=b[d]);Ll.prototype.h.call(this,a,b);d=this.e;c={rb:this.rb,qb:this.qb,marginTop:this.marginTop,marginRight:this.marginRight,marginBottom:this.marginBottom,marginLeft:this.marginLeft};d.j=c;d=d.style;d.width=new L(c.rb);d.height=new L(c.qb);d["padding-left"]=new L(c.marginLeft);d["padding-right"]=new L(c.marginRight);d["padding-top"]=new L(c.marginTop);
var e=c.marginBottom.b;d["padding-bottom"]=new L(G(e,c.marginBottom,new B(e,.75)))};mn.prototype.Cc=function(){var a=vn(this,{start:"left",end:"right",Y:"width"});this.rb=a.kd;this.marginLeft=a.rd;this.marginRight=a.qd};mn.prototype.Dc=function(){var a=vn(this,{start:"top",end:"bottom",Y:"height"});this.qb=a.kd;this.marginTop=a.rd;this.marginBottom=a.qd};
function vn(a,b){var c=a.style,d=a.d.d,e=b.start,f=b.end,g=b.Y,k=a.d.w[g].fa(d,null),h=Y(d,c[g],k),l=Y(d,c["margin-"+e],k),n=Y(d,c["margin-"+f],k),p=Ml(d,c["padding-"+e],k),q=Ml(d,c["padding-"+f],k),r=Ol(d,c["border-"+e+"-width"],c["border-"+e+"-style"],k),v=Ol(d,c["border-"+f+"-width"],c["border-"+f+"-style"],k),y=G(d,k,F(d,F(d,r,p),F(d,v,q)));h?(y=G(d,y,h),l||n?l?n=G(d,y,l):l=G(d,y,n):n=l=Qc(d,y,new B(d,.5))):(l||(l=d.b),n||(n=d.b),h=G(d,y,F(d,l,n)));c[e]=new L(l);c[f]=new L(n);c["margin-"+e]=$d;
c["margin-"+f]=$d;c["padding-"+e]=new L(p);c["padding-"+f]=new L(q);c["border-"+e+"-width"]=new L(r);c["border-"+f+"-width"]=new L(v);c[g]=new L(h);c["max-"+g]=new L(h);return{kd:G(d,k,F(d,l,n)),rd:l,qd:n}}mn.prototype.tb=function(a,b,c){Ll.prototype.tb.call(this,a,b,c);c.u=b.d};function nn(a,b){Ll.call(this,a,b);var c=b.l;this.j=en[c];a.qa[c]=this;this.wa=!0}t(nn,Ll);m=nn.prototype;
m.tb=function(a,b,c){var d=b.d;u(d,"display","flex");var e=Xl(this,a,"vertical-align"),f=null;e===J("middle")?f="center":e===J("top")?f="flex-start":e===J("bottom")&&(f="flex-end");f&&(u(d,"flex-flow",this.b?"row":"column"),u(d,"justify-content",f));Ll.prototype.tb.call(this,a,b,c)};
m.ha=function(a,b){var c=this.style,d=this.d.d,e=a.start,f=a.end,g="left"===e,k=g?b.rb:b.qb,h=Y(d,c[a.Y],k),g=g?b.marginLeft:b.marginTop;if("start"===this.j.ha)c[e]=new L(g);else if(h){var l=Ml(d,c["margin-"+e],k),n=Ml(d,c["margin-"+f],k),p=Ml(d,c["padding-"+e],k),q=Ml(d,c["padding-"+f],k),r=Ol(d,c["border-"+e+"-width"],c["border-"+e+"-style"],k),f=Ol(d,c["border-"+f+"-width"],c["border-"+f+"-style"],k),h=F(d,h,F(d,F(d,p,q),F(d,F(d,r,f),F(d,l,n))));switch(this.j.ha){case "center":c[e]=new L(F(d,g,
Rc(d,G(d,k,h),new B(d,2))));break;case "end":c[e]=new L(G(d,F(d,g,k),h))}}};
function wn(a,b,c){function d(a){if(y)return y;y={Y:v?v.evaluate(a):null,Ca:h?h.evaluate(a):null,Da:l?l.evaluate(a):null};var b=k.evaluate(a),c=0;[q,n,p,r].forEach(function(b){b&&(c+=b.evaluate(a))});(null===y.Ca||null===y.Da)&&c+y.Y+y.Ca+y.Da>b&&(null===y.Ca&&(y.Ca=0),null===y.Da&&(y.ae=0));null!==y.Y&&null!==y.Ca&&null!==y.Da&&(y.Da=null);null===y.Y&&null!==y.Ca&&null!==y.Da?y.Y=b-c-y.Ca-y.Da:null!==y.Y&&null===y.Ca&&null!==y.Da?y.Ca=b-c-y.Y-y.Da:null!==y.Y&&null!==y.Ca&&null===y.Da?y.Da=b-c-y.Y-
y.Ca:null===y.Y?(y.Ca=y.Da=0,y.Y=b-c):y.Ca=y.Da=(b-c-y.Y)/2;return y}var e=a.style;a=a.d.d;var f=b.Ec,g=b.Jc;b=b.Y;var k=c["margin"+g.charAt(0).toUpperCase()+g.substring(1)],h=Nl(a,e["margin-"+f],k),l=Nl(a,e["margin-"+g],k),n=Ml(a,e["padding-"+f],k),p=Ml(a,e["padding-"+g],k),q=Ol(a,e["border-"+f+"-width"],e["border-"+f+"-style"],k),r=Ol(a,e["border-"+g+"-width"],e["border-"+g+"-style"],k),v=Y(a,e[b],k),y=null;e[b]=new L(new bc(a,function(){var a=d(this).Y;return null===a?0:a},b));e["margin-"+f]=new L(new bc(a,
function(){var a=d(this).Ca;return null===a?0:a},"margin-"+f));e["margin-"+g]=new L(new bc(a,function(){var a=d(this).Da;return null===a?0:a},"margin-"+g));"left"===f?e.left=new L(F(a,c.marginLeft,c.rb)):"top"===f&&(e.top=new L(F(a,c.marginTop,c.qb)))}m.Cc=function(){var a=this.e.j;this.j.sa?wn(this,{Ec:"right",Jc:"left",Y:"width"},a):this.j.ta?wn(this,{Ec:"left",Jc:"right",Y:"width"},a):this.ha({start:"left",end:"right",Y:"width"},a)};
m.Dc=function(){var a=this.e.j;this.j.ua?wn(this,{Ec:"bottom",Jc:"top",Y:"height"},a):this.j.ra?wn(this,{Ec:"top",Jc:"bottom",Y:"height"},a):this.ha({start:"top",end:"bottom",Y:"height"},a)};m.Zb=function(a,b,c,d,e,f){Ll.prototype.Zb.call(this,a,b,c,d,e,f);a=c.l;c=this.d.l;d=this.j;d.sa||d.ta?d.ua||d.ra||(d.sa?a.left[c]=b:d.ta&&(a.right[c]=b)):d.ua?a.top[c]=b:d.ra&&(a.bottom[c]=b)};
function xn(a,b,c,d,e){this.b=a;this.h=b;this.f=c;this.d=d;this.e=e;this.g={};a=this.h;b=new Jc(a,"page-number");b=new Bc(a,new Hc(a,b,new B(a,2)),a.b);c=new rc(a,b);a.values["recto-page"]=c;a.values["verso-page"]=b;"ltr"===$m(this.e)?(a.values["left-page"]=b,b=new rc(a,b),a.values["right-page"]=b):(c=new rc(a,b),a.values["left-page"]=c,a.values["right-page"]=b)}function yn(a){var b={};hi(a.b,[],"",b);a.b.pop();return b}
function zn(a,b){var c=[],d;for(d in b)if(Object.prototype.hasOwnProperty.call(b,d)){var e=b[d],f;f=e instanceof V?e.value+"":zn(a,e);c.push(d+f+(e.Ea||""))}return c.sort().join("^")}function An(a){this.b=null;this.f=a}t(An,X);An.prototype.apply=function(a){a.I===this.f&&this.b.apply(a)};An.prototype.d=function(){return 3};An.prototype.e=function(a){this.b&&sh(a.Gb,this.f,this.b);return!0};function Bn(a){this.b=null;this.f=a}t(Bn,X);
Bn.prototype.apply=function(a){1===(new Jc(this.f,"page-number")).evaluate(a.d)&&this.b.apply(a)};Bn.prototype.d=function(){return 2};function Cn(a){this.b=null;this.f=a}t(Cn,X);Cn.prototype.apply=function(a){(new Jc(this.f,"left-page")).evaluate(a.d)&&this.b.apply(a)};Cn.prototype.d=function(){return 1};function Dn(a){this.b=null;this.f=a}t(Dn,X);Dn.prototype.apply=function(a){(new Jc(this.f,"right-page")).evaluate(a.d)&&this.b.apply(a)};Dn.prototype.d=function(){return 1};
function En(a){this.b=null;this.f=a}t(En,X);En.prototype.apply=function(a){(new Jc(this.f,"recto-page")).evaluate(a.d)&&this.b.apply(a)};En.prototype.d=function(){return 1};function Fn(a){this.b=null;this.f=a}t(Fn,X);Fn.prototype.apply=function(a){(new Jc(this.f,"verso-page")).evaluate(a.d)&&this.b.apply(a)};Fn.prototype.d=function(){return 1};function Gn(a,b){qh.call(this,a,b,null,null)}t(Gn,qh);
Gn.prototype.apply=function(a){var b=a.d,c=a.w,d=this.style,e=this.b;kh(b,c,d,e,null,null);if(d=d._marginBoxes){var c=ih(c,"_marginBoxes"),f;for(f in d)if(d.hasOwnProperty(f)){var g=c[f];g||(g={},c[f]=g);kh(b,g,d[f],e,null,null);g.content&&(g.content=g.content.xc(new Rh(a,null)))}}};function Hn(a,b,c,d){pi.call(this,a,b,null,c,null,d,!1);this.f=""}t(Hn,pi);m=Hn.prototype;m.vb=function(){this.f+="@page ";this.gb()};m.$a=function(a,b){this.f+=b;b&&(this.b.push(new An(b)),this.d+=65536)};
m.Hb=function(a,b){b&&wf(this,"E_INVALID_PAGE_SELECTOR :"+a+"("+b.join("")+")");this.f+=":"+a;switch(a.toLowerCase()){case "first":this.b.push(new Bn(this.e));this.d+=256;break;case "left":this.b.push(new Cn(this.e));this.d+=1;break;case "right":this.b.push(new Dn(this.e));this.d+=1;break;case "recto":this.b.push(new En(this.e));this.d+=1;break;case "verso":this.b.push(new Fn(this.e));this.d+=1;break;default:wf(this,"E_INVALID_PAGE_SELECTOR :"+a)}};m.ma=function(){this.f+="{";pi.prototype.ma.call(this)};
m.Ta=function(){this.f+="}";document.getElementById("vivliostyle-page-rules").textContent+=this.f;pi.prototype.Ta.call(this)};
m.Ka=function(a,b,c){if("size"===a){var d=b.ad()&&b.values[1]===Bd,e=(d?b.values[0]:b).toString().toLowerCase(),f=an[e];f&&("a5"===e||"a4"===e||"a3"===e||"b5"===e||"b4"===e||"letter"===e||"legal"===e||"ledger"===e?d&&(e+=" landscape"):(e=f.width.stringValue(),f=f.height.stringValue(),e=d?f+" "+e:e+" "+f));this.f+="size: "+e+(c?" !important":"")+";"}pi.prototype.Ka.call(this,a,b,c)};m.nd=function(a){sh(this.h.Gb,"*",a)};m.pd=function(a){return new Gn(this.k,a)};
m.Oc=function(a){var b=ih(this.k,"_marginBoxes"),c=b[a];c||(c={},b[a]=c);sf(this.Z,new In(this.e,this.Z,this.u,c))};function In(a,b,c,d){tf.call(this,a,b,!1);this.d=c;this.b=d}t(In,uf);In.prototype.Ka=function(a,b,c){Rg(this.d,a,b,c,this)};In.prototype.Eb=function(a,b){vf(this,"E_INVALID_PROPERTY_VALUE "+a+": "+b.toString())};In.prototype.lc=function(a,b){vf(this,"E_INVALID_PROPERTY "+a+": "+b.toString())};In.prototype.fb=function(a,b,c){hh(this.b,a,new V(b,c?pf(this):qf(this)))};
function Jn(a){this.d=a;this.b={};this.b.page=[0]}function Kn(a,b){Object.keys(b.b).forEach(function(a){this.b[a]=Array.b(b.b[a])},a)}function Zh(a,b,c){return new bc(a.d,function(){var d=a.b[b];return c(d&&d.length?d[d.length-1]:null)},"page-counter-"+b)}function ai(a,b,c){return new bc(a.d,function(){return c(a.b[b]||[])},"page-counters-"+b)}
function Ln(a,b,c){var d,e=b["counter-reset"];e&&(e=e.evaluate(c))&&(d=cg(e,!0));if(d)for(var f in d){var e=a,g=f,k=d[f];e.b[g]?e.b[g].push(k):e.b[g]=[k]}var h;(b=b["counter-increment"])&&(c=b.evaluate(c))&&(h=cg(c,!1));h?"page"in h||(h.page=1):h={page:1};for(var l in h)a.b[l]||(c=a,b=l,c.b[b]?c.b[b].push(0):c.b[b]=[0]),c=a.b[l],c[c.length-1]+=h[l]};function Mn(a,b,c,d,e,f,g,k,h){this.h=a;this.g=b;this.b=c;this.d=d;this.w=e;this.f=f;this.l=a.D;this.u=g;this.e=k;this.k=h;this.j=a.f;dc(this.b,function(a){return(a=this.b.b[a])?0<a.b.length&&a.b[0].b.b<=this.h:!1});cc(this.b,new bc(this.b,function(){return this.wa+this.b.d},"page-number"))}
function Nn(a,b,c,d){if(a.k.length){var e=new fc(0,b,c,d);a=a.k;for(var f={},g=0;g<a.length;g++)kh(e,f,a[g],0,null,null);g=f.width;a=f.height;var f=f["text-zoom"],k=1;if(g&&a||f){var h=ec.em;(f?f.evaluate(e,"text-zoom"):null)===Ld&&(k=h/d,d=h,b*=k,c*=k);if(g&&a&&(g=id(g.evaluate(e,"width"),e),e=id(a.evaluate(e,"height"),e),0<g&&0<e))return{width:g,height:e,fontSize:d}}}return{width:b,height:c,fontSize:d}}
function On(a,b,c,d,e,f,g,k,h){fc.call(this,0,d.width,d.height,d.fontSize);this.style=a;this.$=b;this.lang=b.lang||c;this.viewport=d;this.e={body:!0};this.f=e;this.b=this.D=this.d=this.k=null;this.h=0;this.Ya=f;this.na=new Ei(this.style.l);this.qa={};this.M=null;this.j=new Jn(a.b);this.I={};this.ga=null;this.Fa=g;this.Ga=k;this.wa=h;for(var l in a.e)(b=a.e[l]["flow-consume"])&&(b.evaluate(this,"flow-consume")==kd?this.e[l]=!0:delete this.e[l])}t(On,fc);
function Pn(a){var b=M("StyleInstance.init");a.d=new ek(a.$,a.style.d,a.style.g,a,a.e,a.style.j,a.j);var c=a.d;c.k=a;for(var d=0;d<c.B.length;d++)mk(c.k,c.B[d]);a.D={};c=a.D[a.$.url]=a.d;for(d=0;!c.j&&(d+=5E3,nk(c,d,0)!=Number.POSITIVE_INFINITY););c=c.u;a.ga=$m(c);a.k=new lm(a.style.w);d=new ei(a.style.d,a,a.j);a.k.h(d,c);km(a.k,a);a.M=new xn(d,a.style.b,a.k,a,c);c=[];for(d=0;d<a.style.f.length;d++){var e=a.style.f[d];if(!e.J||e.J.evaluate(a)){var f=e.lb,g=a,e={},k=void 0;for(k in f)e[k]=f[k].evaluate(g,
k);f=e;g=void 0;for(g in zi)f[g]||(f[g]=zi[g]);e=new Ci(e);c.push(e)}}d=a.Ya;a=a.na;e=[];for(f=0;f<c.length;f++)g=c[f],g.src&&g.b?e.push(Ii(d,g,a)):w("E_FONT_FACE_INVALID");eg(e).pa(b);return O(b)}function mk(a,b){var c=a.b;if(c){var d=c.b[b.f];d||(d=new Lj,c.b[b.f]=d);d.b.push(new Kj(new Jj({ia:[{ea:b.g,La:0,ca:null,va:null,oa:null}],ba:0,K:!1}),b))}}
function Qn(a,b){if(!b)return 0;var c=Number.POSITIVE_INFINITY,d;for(d in a.e){var e=b.b[d];if((!e||0==e.b.length)&&a.b){var f=a.d;f.l=d;for(e=0;null!=f.l&&(e+=5E3,nk(f,e,0)!=Number.POSITIVE_INFINITY););e=a.b.b[d];b!=a.b&&e&&(e=e.clone(),b.b[d]=e)}if(e){for(var f=a,g=Number.POSITIVE_INFINITY,k=0;k<e.b.length;k++){for(var h=e.b[k].d.Ra,l=h.ia[0].ea,n=h.ba,p=h.K,q=0;l.ownerDocument!=f.$.b;)q++,l=h.ia[q].ea,p=!1,n=0;h=Ni(f.$,l,n,p);h<g&&(g=h)}f=g;f<c&&(c=f)}}return c}
function Rn(a,b){var c=Qn(a,a.b);if(c==Number.POSITIVE_INFINITY)return null;for(var d=a.k.children,e,f=0;f<d.length;f++)if(e=d[f],"vivliostyle-page-rule-master"!==e.d.eb){var g=1,k=Xl(e,a,"utilization");k&&k.$c()&&(g=k.C);k=hc(a,"em",!1);a.h=nk(a.d,c,Math.ceil(g*a.u()*a.l()/(k*k)));var g=a,k=g.b.d,h=void 0;for(h in g.b.b)for(var l=g.b.b[h],n=l.b.length-1;0<=n;n--){var p=l.b[n];0>p.b.e&&p.b.b<g.h&&(p.b.e=k)}gc(a,a.style.b);g=Xl(e,a,"enabled");if(!g||g===Vd){d=a;w("Location - page "+d.b.d);w("  currnt: "+
c);w("  lookup: "+d.h);c=void 0;for(c in d.b.b)for(f=d.b.b[c],g=0;g<f.b.length;g++)w("  Chunk "+c+": "+f.b[g].b.b);c=a.M;f=b;g=e.d;if(0===Object.keys(f).length)g.d.e=g;else{e=g;d=zn(c,f);e=e.g+"^"+d;d=c.g[e];if(!d){if("background-host"===g.eb)d=c,f=(new gn(d.h,d.f.d,f)).f(d.f),f.h(d.b,d.e),km(f,d.d),d=f;else{d=c;k=f;f=g.clone({eb:"vivliostyle-page-rule-master"});if(g=k.size)k=cn(k),g=g.Ea,f.b.width=eh(d.d,f.b.width,new V(k.width,g)),f.b.height=eh(d.d,f.b.height,new V(k.height,g));f=f.f(d.f);f.h(d.b,
d.e);km(f,d.d);d=f}c.g[e]=d}e=d.d;e.d.e=e;e=d}return e}}throw Error("No enabled page masters");}
function Sn(a,b,c){var d=a.b.b[c];if(!d)return N(!0);Yk(b);a.e[c]&&0<b.Ya.length&&(b.hd=!1);var e=M("layoutColumn"),f=[];bf(function(c){for(;0<d.b.length;){var e=0,h=d.b[e];if(h.b.b>a.h)break;for(var l=1;l<d.b.length;l++){var n=d.b[l];if(n.b.b>a.h)break;yj(n.b,h.b)&&(h=n,e=l)}var p=h.b,q=!0;al(b,h.d).then(function(a){h.b.Hd&&(null===a||p.d)&&f.push(h);p.d?(d.b.splice(e,1),R(c)):a?(h.d=a,R(c)):(d.b.splice(e,1),q?q=!1:df(c))});if(q){q=!1;return}}R(c)}).then(function(){0<f.length&&(d.b=f.concat(d.b));
Q(e,!0)});return O(e)}
function Tn(a,b,c,d,e,f,g,k){var h=Xl(c,a,"enabled");if(h&&h!==Vd)return N(!0);var l=M("layoutContainer"),n=Xl(c,a,"wrap-flow")===ld,p=c.b?c.g&&c.D:c.f&&c.I,h=Xl(c,a,"flow-from"),q=a.viewport.b.createElement("div"),r=Xl(c,a,"position");u(q,"position",r?r.name:"absolute");d.insertBefore(q,d.firstChild);var v=new Nj(q);v.b=c.b;c.tb(a,v,b);v.A=e;v.B=f;e+=v.left+v.marginLeft+v.aa;f+=v.top+v.marginTop+v.ga;if(h&&h.od())if(a.I[h.toString()])c.Zb(a,v,b,null,1,a.f),h=N(!0);else{var y=M("layoutContainer.inner"),
I=h.toString(),W=Z(c,a,"column-count"),P=Z(c,a,"column-gap"),E=1<W?Z(c,a,"column-width"):v.width,h=Wl(c,a),Ea=0,r=Xl(c,a,"shape-inside"),mb=ag(r,0,0,v.width,v.height,a),Pk=new Cm(I,a,a.viewport,a.d,h,a.$,a.na,a.style.u,a,b,a.Fa,a.Ga,k),xh=0,aa=null;bf(function(b){for(;xh<W;){var c=xh++;if(1<W){var d=a.viewport.b.createElement("div");u(d,"position","absolute");q.appendChild(d);aa=new xk(d,Pk,a.f);aa.b=v.b;aa.Ga=v.Ga;aa.Ub=v.Ub;v.b?(u(d,"margin-left",v.j+"px"),u(d,"margin-right",v.D+"px"),c=c*(E+P)+
v.k,Uj(aa,0,v.width),Tj(aa,c,E)):(u(d,"margin-top",v.k+"px"),u(d,"margin-bottom",v.w+"px"),c=c*(E+P)+v.j,Tj(aa,0,v.height),Uj(aa,c,E));aa.A=e+v.j;aa.B=f+v.k}else aa=new xk(q,Pk,a.f),Sj(aa,v),v=aa;aa.I=p?[]:g;aa.Sb=mb;if(0<=aa.width){var h=M("inner");Sn(a,aa,I).then(function(){aa.M&&"column"!=aa.M&&(xh=W,"region"!=aa.M&&(a.I[I]=!0));Q(h,!0)});c=O(h)}else c=N(!0);if(c.za()){c.then(function(){0<k.b.length?R(b):(Ea=Math.max(Ea,aa.e),df(b))});return}0<k.b.length||(Ea=Math.max(Ea,aa.e))}R(b)}).then(function(){v.e=
Ea;c.Zb(a,v,b,aa,W,a.f);Q(y,!0)});h=O(y)}else{h=Xl(c,a,"content");r=!1;if(h&&Wj(h)){var Qk=a.viewport.b.createElement("span");h.S(new Vj(Qk,a));q.appendChild(Qk);jm(c,a,v)}else c.wa&&(d.removeChild(q),r=!0);r||c.Zb(a,v,b,null,1,a.f);h=N(!0)}h.then(function(){if(!c.f||0<Math.floor(v.e)){if(!n){var h=v.A+v.left,p=v.B+v.top,r=Qj(v)+v.width+Rj(v),y=Oj(v)+v.height+Pj(v),E=Xl(c,a,"shape-outside"),h=ag(E,h,p,r,y,a);Ua(a.viewport.root)&&g.push(ke(h,0,-1.25*hc(a,"em",!1)));g.push(h)}}else if(0==c.children.length){d.removeChild(q);
Q(l,!0);return}var I=c.children.length-1;af(function(){for(;0<=I;){var d=c.children[I--],d=Tn(a,b,d,q,e,f,g,k);if(d.za())return d}return N(!1)}).then(function(){Q(l,!0)})});return O(l)}
function Un(a,b,c){a.I={};c?(a.b=c.clone(),hk(a.d,c.e)):(a.b=new Mj,hk(a.d,-1));a.lang&&b.L.setAttribute("lang",a.lang);c=a.b;c.d++;gc(a,a.style.b);var d=yn(a.M);Vn(a,d);var e=Rn(a,d);if(!e)return N(null);e.d.b.width.value===Yd&&tj(b);e.d.b.height.value===Zd&&uj(b);Ln(a.j,d,a);var d=Xl(e,a,"writing-mode")||wd,f=Xl(e,a,"direction")||Ed,g=new sm(b.w.bind(b),d,f),k=c.clone(),h=[],l=M("layoutNextPage");bf(function(d){Tn(a,b,e,b.L,0,0,h.concat(),g).then(function(){if(0<g.b.length){h=h.concat(um(g));g.b.splice(0,
g.b.length);c=a.b=k.clone();for(var e;e=b.L.lastChild;)b.L.removeChild(e);df(d)}else R(d)})}).then(function(){e.aa(a,b,a.f);var d=new Jc(e.d.d,"left-page");b.f=d.evaluate(a)?"left":"right";var d=a.b.d,f;for(f in a.b.b)for(var g=a.b.b[f],h=g.b.length-1;0<=h;h--){var k=g.b[h];0<=k.b.e&&k.b.e+k.b.j-1<=d&&g.b.splice(h,1)}a.b=null;c.e=a.d.b;f=a.style.h.B[a.$.url];d=b.L.firstElementChild.getBoundingClientRect();b.b.width=d.width;b.b.height=d.height;g=b.g;for(d=0;d<g.length;d++)h=g[d],u(h.target,h.name,
h.value.toString());for(d=0;d<f.length;d++)if(g=f[d],k=b.h[g.Jb],h=b.h[g.Ed],k&&h&&(k=rj(k,g.action)))for(var y=0;y<h.length;y++)h[y].addEventListener(g.event,k,!1);var I;a:{for(I in a.e)if((f=c.b[I])&&0<f.b.length){I=!1;break a}I=!0}I&&(c=null);Q(l,c)});return O(l)}function Vn(a,b){var c=cn(b),d=c.width;d===Yd?a.A=null:a.A=d.C*hc(a,d.ja,!1);c=c.height;c===Zd?a.w=null:a.w=c.C*hc(a,c.ja,!1)}function Wn(a,b,c,d){pi.call(this,a.g,a,b,c,d,a.f,!c);this.f=a;this.A=!1}t(Wn,pi);m=Wn.prototype;m.hc=function(){};
m.gc=function(a,b,c){a=new Gl(this.f.j,a,b,c,this.f.u,this.J,qf(this.Z));sf(this.f,new qm(a.d,this.f,a,this.u))};m.mb=function(a){a=a.d;null!=this.J&&(a=Pc(this.e,this.J,a));sf(this.f,new Wn(this.f,a,this,this.B))};m.dc=function(){sf(this.f,new si(this.e,this.Z))};m.fc=function(){var a={};this.f.k.push({lb:a,J:this.J});sf(this.f,new ti(this.e,this.Z,null,a,this.f.f))};m.ec=function(a){var b=this.f.h[a];b||(b={},this.f.h[a]=b);sf(this.f,new ti(this.e,this.Z,null,b,this.f.f))};
m.jc=function(){var a={};this.f.w.push(a);sf(this.f,new ti(this.e,this.Z,this.J,a,this.f.f))};m.Kb=function(a){var b=this.f.l;if(a){var c=ih(b,"_pseudos"),b=c[a];b||(b={},c[a]=b)}sf(this.f,new ti(this.e,this.Z,null,b,this.f.f))};m.ic=function(){this.A=!0;this.gb()};m.vb=function(){var a=new Hn(this.f.j,this.f,this,this.u);sf(this.f,a);a.vb()};
m.ma=function(){pi.prototype.ma.call(this);if(this.A){this.A=!1;var a="R"+this.f.B++,b=J(a),c;this.J?c=new dh(b,0,this.J):c=new V(b,0);jh(this.k,"region-id").push(c);this.Ta();a=new Wn(this.f,this.J,this,a);sf(this.f,a);a.ma()}};
function Xn(a){var b=a.getAttribute("content");if(!b)return"";a={};for(var c;null!=(c=b.match(/^,?\s*([-A-Za-z_.][-A-Za-z_0-9.]*)\s*=\s*([-+A-Za-z_0-9.]*)\s*/));)b=b.substr(c[0].length),a[c[1]]=c[2];b=a.width-0;a=a.height-0;return b&&a?"@-epubx-viewport{width:"+b+"px;height:"+a+"px;}":""}function Yn(a){rf.call(this);this.f=a;this.g=new $b(null);this.j=new $b(this.g);this.u=new Dl(this.g);this.A=new Wn(this,null,null,null);this.B=0;this.k=[];this.l={};this.h={};this.w=[];this.b=this.A}t(Yn,rf);
Yn.prototype.Q=function(a){w("CSS parser: "+a)};function Zn(a,b){return $n(b,a)}function ao(a){hf.call(this,Zn,"document");this.D=a;this.A={};this.h={};this.b={};this.B={};this.f=null;this.j=[]}t(ao,hf);function bo(a){var b=fa("user-agent.xml",ea),c=M("OPSDocStore.init");jf(Sg).then(function(d){a.f=d;jf(vi).then(function(){a.load(b).then(function(){Q(c,!0)})})});return O(c)}function co(a,b){a.j.push({url:b.url,text:b.text,Ua:"User",ya:null,media:null})}
function $n(a,b){var c=M("OPSDocStore.load"),d=b.url;Vi(b,a).then(function(b){for(var f=[],g=b.b.getElementsByTagNameNS("http://www.idpf.org/2007/ops","trigger"),k=0;k<g.length;k++){var h=g[k],l=h.getAttributeNS("http://www.w3.org/2001/xml-events","observer"),n=h.getAttributeNS("http://www.w3.org/2001/xml-events","event"),p=h.getAttribute("action"),h=h.getAttribute("ref");l&&n&&p&&h&&f.push({Ed:l,event:n,action:p,Jb:h})}a.B[d]=f;var q=[],f=fa("user-agent-page.css",ea);q.push({url:f,text:null,Ua:"UA",
ya:null,media:null});for(k=0;k<a.j.length;k++)q.push(a.j[k]);if(f=b.h)for(f=f.firstChild;f;f=f.nextSibling)if(1==f.nodeType)if(g=f,k=g.namespaceURI,l=g.localName,"http://www.w3.org/1999/xhtml"==k)if("style"==l)q.push({url:d,text:g.textContent,Ua:"Author",ya:null,media:null});else if("link"==l){if(n=g.getAttribute("rel"),k=g.getAttribute("class"),l=g.getAttribute("media"),"stylesheet"==n||"alternate stylesheet"==n&&k)g=g.getAttribute("href"),g=fa(g,d),q.push({url:g,text:null,ya:k,media:l,Ua:"Author"})}else"meta"==
l&&"viewport"==g.getAttribute("name")&&q.push({url:d,text:Xn(g),Ua:"Author",J:null,media:null});else"http://www.gribuser.ru/xml/fictionbook/2.0"==k?"stylesheet"==l&&"text/css"==g.getAttribute("type")&&q.push({url:d,text:g.textContent,Ua:"Author",ya:null,media:null}):"http://example.com/sse"==k&&"property"===l&&(k=g.getElementsByTagName("name")[0])&&"stylesheet"===k.textContent&&(g=g.getElementsByTagName("value")[0])&&(g=fa(g.textContent,d),q.push({url:g,text:null,ya:null,media:null,Ua:"Author"}));
for(var r="",k=0;k<q.length;k++)r+=q[k].url,r+="^",q[k].text&&(r+=q[k].text),r+="^";var v=a.A[r];v?(a.b[d]=v,Q(c,b)):(f=a.h[r],f||(f=new lf(function(){var b=M("fetchStylesheet"),c=0,d=new Yn(a.f);af(function(){if(c<q.length){var a=q[c++];d.wb(a.Ua);var b;if(null!==a.text){b=a.url;var e=a.ya,f=a.media,a=new Pb(a.text);b=Rf(a,d,b,e,f)}else b=Tf(a.url,d,a.ya,a.media);return b}return N(!1)}).then(function(){v=new Mn(a,d.g,d.j,d.A.h,d.u,d.k,d.l,d.h,d.w);a.A[r]=v;delete a.h[r];Q(b,v)});return O(b)},"FetchStylesheet "+
d),a.h[r]=f,f.start()),jf(f).then(function(f){a.b[d]=f;Q(c,b)}))});return O(c)};function eo(a,b,c,d,e,f,g,k){this.d=a;this.url=b;this.lang=c;this.e=d;this.g=e;this.R=Sb(f);this.h=g;this.f=k;this.Ia=this.b=null}function fo(a,b,c){if(0!=c--)for(b=b.firstChild;b;b=b.nextSibling)if(1==b.nodeType){var d=b;"auto"!=Aa(d,"height","auto")&&(u(d,"height","auto"),fo(a,d,c));"absolute"==Aa(d,"position","static")&&(u(d,"position","relative"),fo(a,d,c))}}
function go(a){var b=a.target,c="\u25b8"==b.textContent;b.textContent=c?"\u25be":"\u25b8";for(b=b.parentNode.firstChild;b;)if(1!=b.nodeType)b=b.nextSibling;else{var d=b;"toc-container"==d.getAttribute("data-adapt-class")?b=d.firstChild:("toc-node"==d.getAttribute("data-adapt-class")&&(d.style.height=c?"auto":"0px"),b=b.nextSibling)}a.stopPropagation()}
eo.prototype.Gc=function(a){var b=this.h.Gc(a);return function(a,d,e){var f=e.behavior;if(!f||"toc-node"!=f.toString()&&"toc-container"!=f.toString())return b(a,d,e);a=d.getAttribute("data-adapt-class");"toc-node"==a&&(e=d.firstChild,"\u25b8"!=e.textContent&&(e.textContent="\u25b8",u(e,"cursor","pointer"),e.addEventListener("click",go,!1)));var g=d.ownerDocument.createElement("div");g.setAttribute("data-adapt-process-children","true");"toc-node"==f.toString()?(e=d.ownerDocument.createElement("div"),
e.textContent="\u25b9",u(e,"margin-left","-1em"),u(e,"display","inline-block"),u(e,"width","1em"),u(e,"text-align","left"),u(e,"cursor","default"),u(e,"font-family","Menlo,sans-serif"),g.appendChild(e),u(g,"overflow","hidden"),g.setAttribute("data-adapt-class","toc-node"),"toc-node"!=a&&"toc-container"!=a||u(g,"height","0px")):"toc-node"==a&&g.setAttribute("data-adapt-class","toc-container");return N(g)}};
eo.prototype.cc=function(a,b,c,d,e){if(this.b)return N(this.b);var f=this,g=M("showTOC"),k=new sj(a);this.b=k;this.d.load(this.url).then(function(d){var l=f.d.b[d.url],n=Nn(l,c,1E5,e);b=new Qm(b.f,n.fontSize,b.root,n.width,n.height);var p=new On(l,d,f.lang,b,f.e,f.g,f.Gc(d),f.f,0);f.Ia=p;p.R=f.R;Pn(p).then(function(){Un(p,k,null).then(function(){fo(f,a,2);Q(g,k)})})});return O(g)};
eo.prototype.$b=function(){if(this.b){var a=this.b;this.Ia=this.b=null;u(a.L,"visibility","none");var b=a.L.parentNode;b&&b.removeChild(a.L)}};eo.prototype.bd=function(){return!!this.b};function ho(){ao.call(this,io(this));this.d=new hf(Vi,"document");this.u=new hf(mf,"text");this.w={};this.M={};this.k={};this.l={}}t(ho,ao);function io(a){return function(b){return a.k[b]}}
function jo(a,b,c){var d=M("loadEPUBDoc");c&&a.u.Yb(b+"?r=list");a.d.Yb(b+"META-INF/encryption.xml");a.d.load(b+"META-INF/container.xml").then(function(e){e=fj(Ki(Ki(Ki(new Li([e.b]),"container"),"rootfiles"),"rootfile"),"full-path");for(var f=0;f<e.length;f++){var g=e[f];if(g){ko(a,b,g,c).pa(d);return}}Q(d,null)});return O(d)}
function ko(a,b,c,d){var e=b+c,f=a.w[e];if(f)return N(f);var g=M("loadOPF");a.d.load(e).then(function(c){a.d.load(b+"META-INF/encryption.xml").then(function(h){(d?a.u.load(b+"?r=list"):N(null)).then(function(d){f=new lo(a,b);mo(f,c,h,d,b+"?r=manifest").then(function(){a.w[e]=f;a.M[b]=f;Q(g,f)})})})});return O(g)}ho.prototype.load=function(a){a=da(a);var b=this.l[a];return b?b.za()?b:N(b.Wb()):ho.Id.load.call(this,a)};
function no(){this.id=null;this.src="";this.g=this.d=null;this.F=-1;this.h=0;this.j=null;this.b=this.e=0;this.f=Na}function oo(a){return a.id}function po(a){var b=De(a);return function(a){var d=M("deobfuscator"),e,f;a.slice?(e=a.slice(0,1040),f=a.slice(1040,a.size)):(e=a.webkitSlice(0,1040),f=a.webkitSlice(1040,a.size-1040));gf(e).then(function(a){a=new DataView(a);for(var c=0;c<a.byteLength;c++){var e=a.getUint8(c),e=e^b[c%20];a.setUint8(c,e)}Q(d,ff([a,f]))});return O(d)}}
var qo={dcterms:"http://purl.org/dc/terms/",marc:"http://id.loc.gov/vocabulary/",media:"http://www.idpf.org/epub/vocab/overlays/#",onix:"http://www.editeur.org/ONIX/book/codelists/current.html#",xsd:"http://www.w3.org/2001/XMLSchema#"},ro=qo.dcterms+"language",so=qo.dcterms+"title";
function to(a,b){var c={};return function(d,e){var f,g,k=d.r||c,h=e.r||c;if(a==so&&(f="main"==k["http://idpf.org/epub/vocab/package/#title-type"],g="main"==h["http://idpf.org/epub/vocab/package/#title-type"],f!=g))return f?-1:1;f=parseInt(k["http://idpf.org/epub/vocab/package/#display-seq"],10);isNaN(f)&&(f=Number.MAX_VALUE);g=parseInt(h["http://idpf.org/epub/vocab/package/#display-seq"],10);isNaN(g)&&(g=Number.MAX_VALUE);return f!=g?f-g:a!=ro&&b&&(f=(k[ro]||k["http://idpf.org/epub/vocab/package/#alternate-script"])==
b,g=(h[ro]||h["http://idpf.org/epub/vocab/package/#alternate-script"])==b,f!=g)?f?-1:1:d.o-e.o}}
function uo(a,b){function c(a){for(var b in a){var d=a[b];d.sort(to(b,l));for(var e=0;e<d.length;e++){var f=d[e].r;f&&c(f)}}}function d(a){return Qa(a,function(a){return Pa(a,function(a){var b={v:a.value,o:a.N};a.be&&(b.s=a.scheme);if(a.id||a.lang){var c=h[a.id];if(c||a.lang)a.lang&&(a={name:ro,value:a.lang,lang:null,id:null,Mc:a.id,scheme:null,N:a.N},c?c.push(a):c=[a]),c=Oa(c,function(a){return a.name}),b.r=d(c)}return b})})}function e(a){if(a&&(a=a.match(/^\s*(([^:]*):)?(\S+)\s*$/))){var b=a[1]?
f[a[1]]:"http://idpf.org/epub/vocab/package/#";if(b)return b+a[3]}return null}var f;if(b){f={};for(var g in qo)f[g]=qo[g];for(;null!=(g=b.match(/(^\s*[A-Z_a-z\u007F-\uFFFF][-.A-Z_a-z0-9\u007F-\uFFFF]*):\s*(\S+)/));)b=b.substr(g[0].length),f[g[1]]=g[2]}else f=qo;var k=1;g=dj(ej(a),function(a){if("meta"==a.localName){var b=e(a.getAttribute("property"));if(b)return{name:b,value:a.textContent,id:a.getAttribute("id"),N:k++,Mc:a.getAttribute("refines"),lang:null,scheme:e(a.getAttribute("scheme"))}}else if("http://purl.org/dc/elements/1.1/"==
a.namespaceURI)return{name:qo.dcterms+a.localName,N:k++,lang:a.getAttribute("xml:lang"),value:a.textContent,id:a.getAttribute("id"),Mc:null,scheme:null};return null});var h=Oa(g,function(a){return a.Mc});g=d(Oa(g,function(a){return a.Mc?null:a.name}));var l=null;g[ro]&&(l=g[ro][0].v);c(g);return g}function vo(){var a=window.MathJax;return a?a.Hub:null}var wo={"appliaction/xhtml+xml":!0,"image/jpeg":!0,"image/png":!0,"image/svg+xml":!0,"image/gif":!0,"audio/mp3":!0};
function lo(a,b){this.e=a;this.g=this.d=this.b=this.h=this.f=null;this.k=b;this.j=null;this.D={};this.lang=null;this.u=0;this.l={};this.I=this.B=this.M=null;this.w={};this.A=null;vo()&&(Ug["http://www.w3.org/1998/Math/MathML"]=!0)}function xo(a,b){return a.k?b.substr(0,a.k.length)==a.k?decodeURI(b.substr(a.k.length)):null:b}
function mo(a,b,c,d,e){a.f=b;var f=Ki(new Li([b.b]),"package"),g=fj(f,"unique-identifier")[0];g&&(g=Ri(b,b.url+"#"+g))&&(a.j=g.textContent.replace(/[ \n\r\t]/g,""));var k={};a.h=Pa(aj(Ki(Ki(f,"manifest"),"item")),function(c){var d=new no,e=b.url;d.id=c.getAttribute("id");d.src=fa(c.getAttribute("href"),e);d.d=c.getAttribute("media-type");if(e=c.getAttribute("properties")){for(var e=e.split(/\s+/),f={},g=0;g<e.length;g++)f[e[g]]=!0;d.f=f}(c=c.getAttribute("fallback"))&&!wo[d.d]&&(k[d.src]=c);!a.B&&
d.f.nav&&(a.B=d);!a.I&&d.f["cover-image"]&&(a.I=d);return d});a.d=Ma(a.h,oo);a.g=Ma(a.h,function(b){return xo(a,b.src)});for(var h in k)for(g=h;;){g=a.d[k[g]];if(!g)break;if(wo[g.d]){a.w[h]=g.src;break}g=g.src}a.b=Pa(aj(Ki(Ki(f,"spine"),"itemref")),function(b,c){var d=b.getAttribute("idref");if(d=a.d[d])d.g=b,d.F=c;return d});if(h=fj(Ki(f,"spine"),"toc")[0])a.M=a.d[h];if(h=fj(Ki(f,"spine"),"page-progression-direction")[0]){a:switch(h){case "ltr":h="ltr";break a;case "rtl":h="rtl";break a;default:throw Error("unknown PageProgression: "+
h);}a.A=h}var g=fj(Ki(Ki($i(Ki(Ki(new Li([c.b]),"encryption"),"EncryptedData"),Zi()),"CipherData"),"CipherReference"),"URI"),l=aj(Ki(Ki(f,"bindings"),"mediaType"));for(c=0;c<l.length;c++){var n=l[c].getAttribute("handler");(h=l[c].getAttribute("media-type"))&&n&&a.d[n]&&(a.D[h]=a.d[n].src)}a.l=uo(Ki(f,"metadata"),fj(f,"prefix")[0]);a.l[ro]&&(a.lang=a.l[ro][0].v);if(!d){if(0<g.length&&a.j)for(d=po(a.j),c=0;c<g.length;c++)a.e.k[a.k+g[c]]=d;return N(!0)}f=new Ba;l={};if(0<g.length&&a.j)for(h="1040:"+
Ee(a.j),c=0;c<g.length;c++)l[g[c]]=h;for(c=0;c<d.length;c++){var p=d[c];if(n=p.n){var q=decodeURI(n),g=a.g[q];h=null;g&&(g.j=0!=p.m,g.h=p.c,g.d&&(h=g.d.replace(/\s+/g,"")));g=l[q];if(h||g)f.append(n),f.append(" "),f.append(h||"application/octet-stream"),g&&(f.append(" "),f.append(g)),f.append("\n")}}yo(a);return ef(e,"","POST",f.toString(),"text/plain")}function yo(a){for(var b=0,c=0;c<a.b.length;c++){var d=a.b[c],e=Math.ceil(d.h/1024);d.e=b;d.b=e;b+=e}a.u=b}
function zo(a,b,c){var d=new no;d.F=0;d.id="item1";d.src=b;a.d={item1:d};a.g={};a.g[b]=d;a.h=[d];a.b=a.h;c?(a=a.e,d=M("EPUBDocStore.load"),b=da(b),(a.l[b]=$n(a,{status:200,url:b,contentType:c.contentType,responseText:null,responseXML:c,bc:null})).pa(d),c=O(d)):c=N(null);return c}function Ao(a,b,c){var d=a.b[b],e=M("getCFI");a.e.load(d.src).then(function(a){var b=Pi(a,c),k=null;b&&(a=Ni(a,b,0,!1),k=new db,hb(k,b,c-a),d.g&&hb(k,d.g,0),k=k.toString());Q(e,k)});return O(e)}
function Bo(a,b){return Ke("resolveFragment",function(c){if(b){var d=new db;eb(d,b);var e;if(a.f){var f=fb(d,a.f.b);if(1!=f.ea.nodeType||f.K||!f.Jb){Q(c,null);return}var g=f.ea,k=g.getAttribute("idref");if("itemref"!=g.localName||!k||!a.d[k]){Q(c,null);return}e=a.d[k];d=f.Jb}else e=a.b[0];a.e.load(e.src).then(function(a){var b=fb(d,a.b);a=Ni(a,b.ea,b.offset,b.K);Q(c,{F:e.F,la:a,O:-1})})}else Q(c,null)},function(a){w("Error resolving fragment "+b);Q(a,null)})}
function Co(a,b){return Ke("resolveEPage",function(c){if(0>=b)Q(c,{F:0,la:0,O:-1});else{var d=Ka(a.b.length,function(c){c=a.b[c];return c.e+c.b>b}),e=a.b[d];a.e.load(e.src).then(function(a){b-=e.e;b>e.b&&(b=e.b);var g=0;0<b&&(a=Oi(a),g=Math.round(a*b/e.b),g==a&&g--);Q(c,{F:d,la:g,O:-1})})}},function(a){w("Error resolving epage: "+b);Q(a,null)})}
function Do(a,b){var c=a.b[b.F];if(0>=b.la)return N(c.e);var d=M("getEPage");a.e.load(c.src).then(function(a){a=Oi(a);var f=Math.min(a,b.la);Q(d,c.e+f*c.b/a)});return O(d)}function Eo(a,b,c,d){this.b=a;this.viewport=b;this.f=c;this.ub=[];this.la=this.O=this.F=0;this.R=Sb(d);this.e=new Pm(b.f)}function Fo(a){var b=a.ub[a.F];return b?b.Za[a.O]:null}m=Eo.prototype;m.cb=function(){if(this.b.A)return this.b.A;var a=this.ub[this.F];return a?a.Ia.ga:null};
function Go(a){var b=M("renderPage");Ho(a).then(function(c){if(c){var d=-1;if(0>a.O){var d=a.la,e=Ka(c.Ja.length,function(a){return Qn(c.Ia,c.Ja[a])>d});a.O=e==c.Ja.length?Number.POSITIVE_INFINITY:e-1}var f=c.Za[a.O];f?(a.la=f.offset,Q(b,f)):bf(function(b){if(a.O<c.Ja.length)R(b);else if(c.complete)a.O=c.Ja.length-1,R(b);else{var e=c.Ja[c.Ja.length-1],h=Io(a,c,e);Un(c.Ia,h,e).then(function(l){h.L.style.display="none";h.L.style.visibility="visible";h.L.setAttribute("data-vivliostyle-page-side",h.f);
(e=l)?(c.Za[e.d-1]=h,c.Ja.push(e),0<=d&&Qn(c.Ia,e)>d?(f=h,a.O=c.Ja.length-2,R(b)):(h.j=0==c.item.F&&0==e.d-1,df(b))):(c.Za.push(h),f=h,a.O=c.Ja.length-1,0>d&&(a.la=h.offset),c.complete=!0,h.j=0==c.item.F&&0==a.O,h.k=c.item.F==a.b.b.length-1,R(b))})}}).then(function(){if(f=f||c.Za[a.O])Q(b,f);else{var e=c.Ja[a.O];0>d&&(a.la=Qn(c.Ia,e));var k=Io(a,c,e);Un(c.Ia,k,e).then(function(d){k.L.style.display="none";k.L.style.visibility="visible";k.L.setAttribute("data-vivliostyle-page-side",k.f);(e=d)?(c.Za[e.d-
1]=k,c.Ja[a.O+1]=e):(c.Za.push(k),c.complete=!0,k.k=c.item.F==a.b.b.length-1);k.j=0==c.item.F&&0==a.O;Q(b,k)})}})}else Q(b,null)});return O(b)}m.Nc=function(){return Jo(this,this.b.b.length-1,Number.POSITIVE_INFINITY)};function Jo(a,b,c){var d=M("renderAllPages"),e=a.F,f=a.O;a.F=0;bf(function(d){a.O=a.F==b?c:Number.POSITIVE_INFINITY;Go(a).then(function(){++a.F>b?R(d):df(d)})}).then(function(){a.F=e;a.O=f;Go(a).pa(d)});return O(d)}m.xd=function(){this.O=this.F=0;return Go(this)};
m.yd=function(){this.F=this.b.b.length-1;this.O=Number.POSITIVE_INFINITY;return Go(this)};m.nextPage=function(){var a=this,b=M("nextPage");Ho(a).then(function(c){if(c){if(c.complete&&a.O==c.Ja.length-1){if(a.F>=a.b.b.length-1){Q(b,null);return}a.F++;a.O=0}else a.O++;Go(a).pa(b)}else Q(b,null)});return O(b)};m.Lc=function(){if(0==this.O){if(0==this.F)return N(null);this.F--;this.O=Number.POSITIVE_INFINITY}else this.O--;return Go(this)};
function Ko(a,b){var c="left"===b.f,d="ltr"===a.cb();return!c&&d||c&&!d}function Lo(a){var b=M("getCurrentSpread"),c=Fo(a);if(!c)return N({left:null,right:null});var d=a.F,e=a.O,f="left"===c.f;(Ko(a,c)?a.Lc():a.nextPage()).then(function(g){a.F=d;a.O=e;Go(a).then(function(){f?Q(b,{left:c,right:g}):Q(b,{left:g,right:c})})});return O(b)}m.Dd=function(){var a=Fo(this);if(!a)return N(null);var a=Ko(this,a),b=this.nextPage();if(a)return b;var c=this;return b.kc(function(){return c.nextPage()})};
m.Gd=function(){var a=Fo(this);if(!a)return N(null);var a=Ko(this,a),b=this.Lc();if(a){var c=this;return b.kc(function(){return c.Lc()})}return b};function Mo(a,b){var c=M("navigateToEPage");Co(a.b,b).then(function(b){b&&(a.F=b.F,a.O=b.O,a.la=b.la);Go(a).pa(c)});return O(c)}function No(a,b){var c=M("navigateToCFI");Bo(a.b,b).then(function(b){b&&(a.F=b.F,a.O=b.O,a.la=b.la);Go(a).pa(c)});return O(c)}
function Oo(a,b){w("Navigate to "+b);var c=xo(a.b,da(b));if(null==c&&(a.b.f&&b.match(/^#epubcfi\(/)&&(c=xo(a.b,a.b.f.url)),null==c))return N(null);var d=a.b.g[c];if(!d)return a.b.f&&c==xo(a.b,a.b.f.url)&&(c=b.indexOf("#"),0<=c)?No(a,b.substr(c+1)):N(null);d.F!=a.F&&(a.F=d.F,a.O=0);var e=M("navigateTo");Ho(a).then(function(c){var d=Ri(c.$,b);d&&(a.la=Mi(c.$,d),a.O=-1);Go(a).pa(e)});return O(e)}
function Io(a,b,c){var d=b.Ia.viewport,e=d.b.createElement("div");d.d.appendChild(e);e.style.position="relative";e.style.visibility="hidden";e.style.left="0px";e.style.top="0px";var f=new sj(e);f.F=b.item.F;f.position=c;f.offset=Qn(b.Ia,c);d!==a.viewport&&(a=Vb(a.viewport.width,a.viewport.height,d.width,d.height),a=Uf(null,new Pb(a)),f.g.push(new pj(e,"transform",a)));return f}
function Po(a,b){var c=vo();if(c){var d=b.ownerDocument,e=d.createElement("span");b.appendChild(e);d=d.importNode(a,!0);e.appendChild(d);d=c.queue;d.Push(["Typeset",c,e]);var c=M("navigateToEPage"),f=Ve(c);d.Push(function(){f.Va(e)});return O(c)}return N(null)}
m.Gc=function(a){var b=this;return function(c,d){var e;if("object"==c.localName&&"http://www.w3.org/1999/xhtml"==c.namespaceURI){var f=c.getAttribute("data");e=null;if(f){var f=fa(f,a.url),g=c.getAttribute("media-type");if(!g){var k=xo(b.b,f);k&&(k=b.b.g[k])&&(g=k.d)}if(g&&(k=b.b.D[g])){e=b.viewport.b.createElement("iframe");e.style.border="none";var f=Ga(f),h=Ga(g),g=new Ba;g.append(k);g.append("?src=");g.append(f);g.append("&type=");g.append(h);for(k=c.firstChild;k;k=k.nextSibling)1==k.nodeType&&
(h=k,"param"==h.localName&&"http://www.w3.org/1999/xhtml"==h.namespaceURI&&(f=h.getAttribute("name"),h=h.getAttribute("value"),f&&h&&(g.append("&"),g.append(encodeURIComponent(f)),g.append("="),g.append(encodeURIComponent(h)))));e.setAttribute("src",g.toString());(g=c.getAttribute("width"))&&e.setAttribute("width",g);(g=c.getAttribute("height"))&&e.setAttribute("height",g)}}e||(e=b.viewport.b.createElement("span"),e.setAttribute("data-adapt-process-children","true"));e=N(e)}else if("http://www.w3.org/1998/Math/MathML"==
c.namespaceURI)e=Po(c,d);else if("http://example.com/sse"==c.namespaceURI){e=d?d.ownerDocument:b.viewport.b;g=c.localName;switch(g){case "t":case "tab":case "ec":case "nt":case "fraction":case "comment":case "mark":g="span";break;case "ruby":case "rp":case "rt":break;default:g="div"}e=e.createElement(g);e.setAttribute("data-adapt-process-children","true");e=N(e)}else e=N(null);return e}};
function Ho(a){if(a.F>=a.b.b.length)return N(null);var b=a.ub[a.F];if(b)return N(b);var c=a.b.b[a.F],d=a.b.e,e=M("getPageViewItem");d.load(c.src).then(function(f){0==c.b&&1==a.b.b.length&&(c.b=Math.ceil(Oi(f)/2700),a.b.u=c.b);var g=d.b[f.url],k=a.Gc(f),h=a.viewport,l=Nn(g,h.width,h.height,h.fontSize);if(l.width!=h.width||l.height!=h.height||l.fontSize!=h.fontSize)h=new Qm(h.f,l.fontSize,h.root,l.width,l.height);var l=a.ub[a.F-1],n=new On(g,f,a.b.lang,h,a.e,a.f,k,a.b.w,l?l.Ia.wa+l.Za.length:0);l&&
Kn(n.j,l.Ia.j);n.R=a.R;Pn(n).then(function(){b={item:c,$:f,Ia:n,Ja:[null],Za:[],complete:!1};a.ub[a.F]=b;Q(e,b)})});return O(e)}function Qo(a){return{F:a.F,O:a.O,la:a.la}}function Ro(a,b){b?(a.F=b.F,a.O=-1,a.la=b.la):(a.F=0,a.O=0,a.la=0);return Jo(a,a.F,a.O)}
m.cc=function(){var a=this.b,b=a.B||a.M;if(!b)return N(null);var c=M("showTOC");this.d||(this.d=new eo(a.e,b.src,a.lang,this.e,this.f,this.R,this,a.w));var a=this.viewport,b=Math.min(350,Math.round(.67*a.width)-16),d=a.height-6,e=a.b.createElement("div");a.root.appendChild(e);e.style.position="absolute";e.style.visibility="hidden";e.style.left="3px";e.style.top="3px";e.style.width=b+10+"px";e.style.maxHeight=d+"px";e.style.overflow="scroll";e.style.overflowX="hidden";e.style.background="#EEE";e.style.border=
"1px outset #999";e.style.borderRadius="2px";e.style.boxShadow=" 5px 5px rgba(128,128,128,0.3)";this.d.cc(e,a,b,d,this.viewport.fontSize).then(function(a){e.style.visibility="visible";Q(c,a)});return O(c)};m.$b=function(){this.d&&this.d.$b()};m.bd=function(){return this.d&&this.d.bd()};function So(a,b,c,d){var e=this;this.h=a;this.ab=b;b.setAttribute("data-vivliostyle-viewer-viewport",!0);b.setAttribute("data-vivliostyle-viewer-status","loading");this.Ga=c;this.Fa=d;this.ga=new Fi(a.document.head,b);this.w="";this.g=null;this.D=this.d=!1;this.f=this.j=this.e=this.l=null;this.fontSize=16;this.zoom=1;this.M=!1;this.Nc=!0;this.R=Rb();this.B=function(){};this.k=function(){};this.I=function(){e.d=!0;e.B()};this.u=function(){};this.aa={loadEPUB:this.na,loadXML:this.qa,configure:this.A,
moveTo:this.wa,toc:this.cc}}function To(a,b){b.i=a.Ga;a.Fa(b)}
So.prototype.na=function(a){Xm.b("loadEPUB");Xm.b("loadFirstPage");this.ab.setAttribute("data-vivliostyle-viewer-status","loading");var b=a.url,c=a.fragment,d=!!a.zipmeta,e=a.userStyleSheet;this.viewport=null;var f=M("loadEPUB"),g=this;g.A(a).then(function(){var a=new ho;if(e)for(var h=0;h<e.length;h++)co(a,e[h]);bo(a).then(function(){var e=fa(b,g.h.location.href);g.w=e;jo(a,e,d).then(function(a){g.g=a;Bo(g.g,c).then(function(a){g.f=a;Uo(g).then(function(){g.ab.setAttribute("data-vivliostyle-viewer-status",
"complete");Xm.d("loadEPUB");To(g,{t:"loaded",metadata:g.g.l});Q(f,!0)})})})})});return O(f)};
So.prototype.qa=function(a){Xm.b("loadXML");Xm.b("loadFirstPage");this.ab.setAttribute("data-vivliostyle-viewer-status","loading");var b=a.url,c=a.document,d=a.fragment,e=a.userStyleSheet;this.viewport=null;var f=M("loadXML"),g=this;g.A(a).then(function(){var a=new ho;if(e)for(var h=0;h<e.length;h++)co(a,e[h]);bo(a).then(function(){var e=fa(b,g.h.location.href);g.w=e;g.g=new lo(a,"");zo(g.g,e,c).then(function(){Bo(g.g,d).then(function(a){g.f=a;Uo(g).then(function(){g.ab.setAttribute("data-vivliostyle-viewer-status",
"complete");Xm.d("loadXML");To(g,{t:"loaded"});Q(f,!0)})})})})});return O(f)};function Vo(a,b){var c=parseFloat(b),d=/[a-z]+$/,e;if("string"===typeof b&&(e=b.match(d))){d=e[0];if("em"===d||"rem"===d)return c*a.fontSize;if("ex"===d||"rex"===d)return c*ec.ex*a.fontSize/ec.em;if(d=ec[d])return c*d}return c}
So.prototype.A=function(a){"boolean"==typeof a.autoresize&&(a.autoresize?(this.l=null,this.h.addEventListener("resize",this.I,!1),this.d=!0):this.h.removeEventListener("resize",this.I,!1));if("number"==typeof a.fontSize){var b=a.fontSize;5<=b&&72>=b&&this.fontSize!=b&&(this.fontSize=b,this.d=!0)}"object"==typeof a.viewport&&a.viewport&&(b=a.viewport,b={marginLeft:Vo(this,b["margin-left"])||0,marginRight:Vo(this,b["margin-right"])||0,marginTop:Vo(this,b["margin-top"])||0,marginBottom:Vo(this,b["margin-bottom"])||
0,width:Vo(this,b.width)||0,height:Vo(this,b.height)||0},200<=b.width||200<=b.height)&&(this.h.removeEventListener("resize",this.I,!1),this.l=b,this.d=!0);"boolean"==typeof a.hyphenate&&(this.R.Ac=a.hyphenate,this.d=!0);"boolean"==typeof a.horizontal&&(this.R.zc=a.horizontal,this.d=!0);"boolean"==typeof a.nightMode&&(this.R.Ic=a.nightMode,this.d=!0);"number"==typeof a.lineHeight&&(this.R.lineHeight=a.lineHeight,this.d=!0);"number"==typeof a.columnWidth&&(this.R.wc=a.columnWidth,this.d=!0);"string"==
typeof a.fontFamily&&(this.R.fontFamily=a.fontFamily,this.d=!0);"boolean"==typeof a.load&&(this.M=a.load);"boolean"==typeof a.renderAllPages&&(this.Nc=a.renderAllPages);"string"==typeof a.userAgentRootURL&&(ea=a.userAgentRootURL);"boolean"==typeof a.spreadView&&a.spreadView!==this.R.Wa&&(this.viewport=null,this.R.Wa=a.spreadView,this.d=!0);"number"==typeof a.pageBorder&&a.pageBorder!==this.R.Fb&&(this.viewport=null,this.R.Fb=a.pageBorder,this.d=!0);"number"==typeof a.zoom&&a.zoom!==this.zoom&&(this.zoom=
a.zoom,this.D=!0);return N(!0)};function Wo(a){var b=[];a.e&&(b.push(a.e),a.e=null);a.j&&(b.push(a.j.left),b.push(a.j.right),a.j=null);b.forEach(function(a){a&&(u(a.L,"display","none"),a.removeEventListener("hyperlink",this.u,!1))},a)}function Xo(a,b){b.addEventListener("hyperlink",a.u,!1);u(b.L,"visibility","visible");u(b.L,"display","block")}function Yo(a,b){Wo(a);a.e=b;Xo(a,b)}
function Zo(a){var b=M("reportPosition");a.f||(a.f=Qo(a.b));Ao(a.g,a.f.F,a.f.la).then(function(c){var d=a.e;(a.M&&0<d.e.length?eg(d.e):N(!0)).then(function(){$o(a,d,c).pa(b)})});return O(b)}function ap(a){var b=a.ab;if(a.l){var c=a.l;b.style.marginLeft=c.marginLeft+"px";b.style.marginRight=c.marginRight+"px";b.style.marginTop=c.marginTop+"px";b.style.marginBottom=c.marginBottom+"px";return new Qm(a.h,a.fontSize,b,c.width,c.height)}return new Qm(a.h,a.fontSize,b)}
function bp(a){if(a.l||!a.viewport||a.viewport.fontSize!=a.fontSize)return!1;var b=ap(a);if(!(b=b.width==a.viewport.width&&b.height==a.viewport.height)&&(b=a.b)){a:{a=a.b.ub;for(b=0;b<a.length;b++){var c=a[b];if(c)for(var c=c.Za,d=0;d<c.length;d++){var e=c[d];if(e.D&&e.B){a=!0;break a}}}a=!1}b=!a}return b}
function cp(a){if(a.b){a.b.$b();for(var b=a.b.ub,c=0;c<b.length;c++){var d=b[c];if(d)for(var d=d.Za,e;e=d.shift();)e=e.L,e.parentNode.removeChild(e)}}a.viewport=ap(a);b=a.viewport;u(b.e,"width","");u(b.e,"height","");u(b.d,"width","");u(b.d,"height","");u(b.d,"transform","");a.b=new Eo(a.g,a.viewport,a.ga,a.R)}
function dp(a,b){a.D=!1;if(a.R.Wa)return Lo(a.b).kc(function(c){Wo(a);a.j=c;c.left&&(Xo(a,c.left),c.right||c.left.L.setAttribute("data-vivliostyle-unpaired-page",!0));c.right&&(Xo(a,c.right),c.left||c.right.L.setAttribute("data-vivliostyle-unpaired-page",!0));c=ep(a,c);a.viewport.zoom(c.width,c.height,a.zoom);a.e=b;return N(null)});Yo(a,b);a.viewport.zoom(b.b.width,b.b.height,a.zoom);a.e=b;return N(null)}
function ep(a,b){var c=0,d=0;b.left&&(c+=b.left.b.width,d=b.left.b.height);b.right&&(c+=b.right.b.width,d=Math.max(d,b.right.b.height));b.left&&b.right&&(c+=2*a.R.Fb);return{width:c,height:d}}var fp={Pd:"fit inside viewport"};
function Uo(a){a.d=!1;if(bp(a))return N(!0);"complete"===a.ab.getAttribute("data-vivliostyle-viewer-status")&&a.ab.setAttribute("data-vivliostyle-viewer-status","resizing");To(a,{t:"resizestart"});var b=M("resize");a.b&&!a.f&&(a.f=Qo(a.b));cp(a);Ro(a.b,a.f).then(function(c){dp(a,c).then(function(){Zo(a).then(function(c){Xm.d("loadFirstPage");(a.Nc?a.b.Nc():N(null)).then(function(){a.ab.setAttribute("data-vivliostyle-viewer-status","complete");To(a,{t:"resizeend"});Q(b,c)})})})});return O(b)}
function $o(a,b,c){var d=M("sendLocationNotification"),e={t:"nav",first:b.j,last:b.k};Do(a.g,a.f).then(function(b){e.epage=b;e.epageCount=a.g.u;c&&(e.cfi=c);To(a,e);Q(d,!0)});return O(d)}So.prototype.cb=function(){return this.b?this.b.cb():null};
So.prototype.wa=function(a){var b=this;if("string"==typeof a.where)switch(a.where){case "next":a=this.R.Wa?this.b.Dd:this.b.nextPage;break;case "previous":a=this.R.Wa?this.b.Gd:this.b.Lc;break;case "last":a=this.b.yd;break;case "first":a=this.b.xd;break;default:return N(!0)}else if("number"==typeof a.epage){var c=a.epage;a=function(){return Mo(b.b,c)}}else if("string"==typeof a.url){var d=a.url;a=function(){return Oo(b.b,d)}}else return N(!0);var e=M("nextPage");a.call(b.b).then(function(a){a?(b.f=
null,dp(b,a).then(function(){Zo(b).pa(e)})):Q(e,!0)});return O(e)};So.prototype.cc=function(a){var b=!!a.autohide;a=a.v;var c=this.b.bd();if(c){if("show"==a)return N(!0)}else if("hide"==a)return N(!0);if(c)return this.b.$b(),N(!0);var d=this,e=M("showTOC");this.b.cc(b).then(function(a){if(a){if(b){var c=function(){d.b.$b()};a.addEventListener("hyperlink",c,!1);a.L.addEventListener("click",c,!1)}a.addEventListener("hyperlink",d.u,!1)}Q(e,!0)});return O(e)};
function gp(a,b){var c=b.a||"";return Ke("runCommand",function(d){var e=a.aa[c];e?e.call(a,b).then(function(){To(a,{t:"done",a:c});Q(d,!0)}):(To(a,{t:"error",content:"No such action",a:c}),Q(d,!0))},function(b,e){To(a,{t:"error",content:e.toString(),a:c});Q(b,!0)})}function hp(a){return"string"==typeof a?JSON.parse(a):a}
function ip(a,b){var c=hp(b),d=null;Me(function(){var b=M("commandLoop"),f=Fe.d;a.u=function(b){var c={t:"hyperlink",href:b.href,internal:b.href.substr(0,a.w.length)==a.w};Ne(f,function(){To(a,c);return N(!0)})};bf(function(b){if(a.d)Uo(a).then(function(){df(b)});else if(a.D)a.e&&dp(a,a.e).then(function(){df(b)});else if(c){var e=c;c=null;gp(a,e).then(function(){df(b)})}else e=M("waitForCommand"),d=Ve(e,self),O(e).then(function(){df(b)})}).pa(b);return O(b)});a.B=function(){var a=d;a&&(d=null,a.Va())};
a.k=function(b){if(c)return!1;c=hp(b);a.B();return!0};a.h.adapt_command=a.k};Array.b||(Array.b=function(a,b,c){b&&c&&(b=b.bind(c));c=[];for(var d=a.length,e=0;e<d;e++)c[e]=b?b(a[e]):a[e];return c});Object.Cb||(Object.Cb=function(a,b){Object.keys(b).forEach(function(c){a[c]=b[c]});return a});function jp(a){var b={};Object.keys(a).forEach(function(c){var d=a[c];switch(c){case "autoResize":b.autoresize=d;break;case "pageBorderWidth":b.pageBorder=d;break;default:b[c]=d}});return b}function kp(a,b){this.f=a;this.b=new So(a.window||window,a.viewportElement,"main",this.wd.bind(this));this.e={autoResize:!0,fontSize:16,pageBorderWidth:1,renderAllPages:!0,spreadView:!1,zoom:1};b&&this.sd(b);this.d=new Ra}m=kp.prototype;
m.sd=function(a){var b=Object.Cb({a:"configure"},jp(a));this.b.k(b);Object.Cb(this.e,a)};m.wd=function(a){var b={type:a.t};Object.keys(a).forEach(function(c){"t"!==c&&(b[c]=a[c])});Sa(this.d,b)};m.Jd=function(a,b){this.d.addEventListener(a,b,!1)};m.Md=function(a,b){this.d.removeEventListener(a,b,!1)};m.zd=function(a,b,c){a||Sa(this.d,{type:"error",content:"No URL specified"});lp(this,a,null,b,c)};m.Kd=function(a,b,c){a||Sa(this.d,{type:"error",content:"No URL specified"});lp(this,null,a,b,c)};
function lp(a,b,c,d,e){d=d||{};var f,g=d.userStyleSheet;g&&(f=g.map(function(a){return{url:a.url||null,text:a.text||null}}));e&&Object.Cb(a.e,e);b=Object.Cb({a:b?"loadXML":"loadEPUB",userAgentRootURL:a.f.userAgentRootURL,url:b||c,document:d.documentObject,fragment:d.fragment,userStyleSheet:f},jp(a.e));ip(a.b,b)}m.cb=function(){return this.b.cb()};
m.Bd=function(a){a:switch(a){case "left":a="ltr"===this.cb()?"previous":"next";break a;case "right":a="ltr"===this.cb()?"next":"previous";break a}this.b.k({a:"moveTo",where:a})};m.Ad=function(a){this.b.k({a:"moveTo",url:a})};m.Ld=function(a){var b;a:{b=this.b;if(!b.e)throw Error("no page exists.");switch(a){case "fit inside viewport":a=b.R.Wa?ep(b,b.j):b.e.b;b=Math.min(b.viewport.width/a.width,b.viewport.height/a.height);break a;default:throw Error("unknown zoom type: "+a);}}return b};
ca("vivliostyle.viewer.Viewer",kp);kp.prototype.setOptions=kp.prototype.sd;kp.prototype.addListener=kp.prototype.Jd;kp.prototype.removeListener=kp.prototype.Md;kp.prototype.loadDocument=kp.prototype.zd;kp.prototype.loadEPUB=kp.prototype.Kd;kp.prototype.getCurrentPageProgression=kp.prototype.cb;kp.prototype.navigateToPage=kp.prototype.Bd;kp.prototype.navigateToInternalUrl=kp.prototype.Ad;kp.prototype.queryZoomFactor=kp.prototype.Ld;ca("vivliostyle.viewer.ZoomType",fp);fp.FIT_INSIDE_VIEWPORT="fit inside viewport";
Tm.call(Xm,"load_vivliostyle","end",void 0);var mp=16,np="ltr";function op(a){window.adapt_command(a)}function pp(){op({a:"moveTo",where:"ltr"===np?"previous":"next"})}function qp(){op({a:"moveTo",where:"ltr"===np?"next":"previous"})}
function rp(a){var b=a.key,c=a.keyIdentifier,d=a.location;if("End"===b||"End"===c)op({a:"moveTo",where:"last"}),a.preventDefault();else if("Home"===b||"Home"===c)op({a:"moveTo",where:"first"}),a.preventDefault();else if("ArrowUp"===b||"Up"===b||"Up"===c)op({a:"moveTo",where:"previous"}),a.preventDefault();else if("ArrowDown"===b||"Down"===b||"Down"===c)op({a:"moveTo",where:"next"}),a.preventDefault();else if("ArrowRight"===b||"Right"===b||"Right"===c)qp(),a.preventDefault();else if("ArrowLeft"===
b||"Left"===b||"Left"===c)pp(),a.preventDefault();else if("0"===b||"U+0030"===c)op({a:"configure",fontSize:Math.round(mp)}),a.preventDefault();else if("t"===b||"U+0054"===c)op({a:"toc",v:"toggle",autohide:!0}),a.preventDefault();else if("+"===b||"Add"===b||"U+002B"===c||"U+00BB"===c||"U+004B"===c&&d===KeyboardEvent.b)mp*=1.2,op({a:"configure",fontSize:Math.round(mp)}),a.preventDefault();else if("-"===b||"Subtract"===b||"U+002D"===c||"U+00BD"===c||"U+004D"===c&&d===KeyboardEvent.b)mp/=1.2,op({a:"configure",
fontSize:Math.round(mp)}),a.preventDefault()}
function sp(a){switch(a.t){case "loaded":a=a.viewer;var b=np=a.cb();a.ab.setAttribute("data-vivliostyle-page-progression",b);a.ab.setAttribute("data-vivliostyle-spread-view",a.R.Wa);window.addEventListener("keydown",rp,!1);document.body.setAttribute("data-vivliostyle-viewer-status","complete");a=document.getElementById("vivliostyle-page-navigation-left");a.addEventListener("click",pp,!1);b=document.getElementById("vivliostyle-page-navigation-right");b.addEventListener("click",qp,!1);[a,b].forEach(function(a){a.setAttribute("data-vivliostyle-ui-state",
"attention");window.setTimeout(function(){a.removeAttribute("data-vivliostyle-ui-state")},1E3)});break;case "error":w("Error: "+a.content);break;case "nav":(a=a.cfi)&&location.replace(ia(location.href,Ga(a||"")));break;case "hyperlink":a.internal&&op({a:"moveTo",url:a.href})}}
ca("vivliostyle.viewerapp.main",function(a){var b=a&&a.fragment||ga("f"),c=a&&a.epubURL||ga("b"),d=a&&a.xmlURL||ga("x"),e=a&&a.defaultPageWidth||ga("w"),f=a&&a.defaultPageHeight||ga("h"),g=a&&a.defaultPageSize||ga("size"),k=a&&a.orientation||ga("orientation"),h=ga("spread"),h=a&&a.spreadView||!!h&&"false"!=h,l=a&&a.viewportElement||document.body;a={a:c?"loadEPUB":"loadXML",url:c||d,autoresize:!0,fragment:b,renderAllPages:!0,userAgentRootURL:a&&a.uaRoot||null,document:a&&a.document||null,userStyleSheet:a&&
a.userStyleSheet||null,spreadView:h,pageBorder:1};var n;if(e&&f)n=e+" "+f;else{switch(g){case "A5":e="148mm";f="210mm";break;case "A4":e="210mm";f="297mm";break;case "A3":e="297mm";f="420mm";break;case "B5":e="176mm";f="250mm";break;case "B4":e="250mm";f="353mm";break;case "letter":e="8.5in";f="11in";break;case "legal":e="8.5in";f="14in";break;case "ledger":e="11in",f="17in"}e&&f&&(n=g,"landscape"===k&&(n=n?n+" landscape":null,g=e,e=f,f=g))}e&&f&&(a.viewport={width:e,height:f},g=document.createElement("style"),
g.textContent="@page { size: "+n+"; margin: 0; }",document.head.appendChild(g));ip(new So(window,l,"main",sp),a)});
    return enclosingObject.vivliostyle;
}.bind(window));

},{}],3:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _knockout = require("knockout");

var _knockout2 = _interopRequireDefault(_knockout);

var supportTouchEvents = ("ontouchstart" in window);

_knockout2["default"].bindingHandlers.menuButton = {
    init: function init(element, valueAccessor) {
        if (_knockout2["default"].unwrap(valueAccessor())) {
            if (supportTouchEvents) {
                element.addEventListener("touchstart", function () {
                    _knockout2["default"].utils.toggleDomNodeCssClass(element, "hover active", true);
                });
                element.addEventListener("touchend", function () {
                    _knockout2["default"].utils.toggleDomNodeCssClass(element, "hover active", false);
                });
            } else {
                element.addEventListener("mouseover", function () {
                    _knockout2["default"].utils.toggleDomNodeCssClass(element, "hover", true);
                });
                element.addEventListener("mousedown", function () {
                    _knockout2["default"].utils.toggleDomNodeCssClass(element, "active", true);
                });
                element.addEventListener("mouseup", function () {
                    _knockout2["default"].utils.toggleDomNodeCssClass(element, "active", false);
                });
                element.addEventListener("mouseout", function () {
                    _knockout2["default"].utils.toggleDomNodeCssClass(element, "hover", false);
                });
            }
        }
    }
};

},{"knockout":1}],4:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
function Logger() {
    this.console = window.console;
}

Logger.prototype.log = function () {
    if (this.console) {
        if (typeof this.console.log === "function") {
            this.console.log.apply(this.console, arguments);
        }
    }
};

Logger.prototype.error = function () {
    if (this.console) {
        if (typeof this.console.error === "function") {
            this.console.error.apply(this.console, arguments);
        } else {
            this.log.apply(this, arguments);
        }
    }
};

exports["default"] = new Logger();
module.exports = exports["default"];

},{}],5:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _vivliostyle = require("vivliostyle");

var _vivliostyle2 = _interopRequireDefault(_vivliostyle);

var _modelsVivliostyle = require("./models/vivliostyle");

var _modelsVivliostyle2 = _interopRequireDefault(_modelsVivliostyle);

var _vivliostyleViewer = require("./vivliostyle-viewer");

var _vivliostyleViewer2 = _interopRequireDefault(_vivliostyleViewer);

_modelsVivliostyle2["default"].setInstance(_vivliostyle2["default"]);
_vivliostyleViewer2["default"].start();

},{"./models/vivliostyle":9,"./vivliostyle-viewer":18,"vivliostyle":2}],6:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _knockout = require("knockout");

var _knockout2 = _interopRequireDefault(_knockout);

var _storesUrlParameters = require("../stores/url-parameters");

var _storesUrlParameters2 = _interopRequireDefault(_storesUrlParameters);

var _pageSize = require("./page-size");

var _pageSize2 = _interopRequireDefault(_pageSize);

function getDocumentOptionsFromURL() {
    return {
        epubUrl: _storesUrlParameters2["default"].getParameter("b"),
        url: _storesUrlParameters2["default"].getParameter("x"),
        fragment: _storesUrlParameters2["default"].getParameter("f")
    };
}

function DocumentOptions() {
    var urlOptions = getDocumentOptionsFromURL();
    this.epubUrl = _knockout2["default"].observable(urlOptions.epubUrl || "");
    this.url = _knockout2["default"].observable(urlOptions.url || "");
    this.fragment = _knockout2["default"].observable(urlOptions.fragment || "");
    this.pageSize = new _pageSize2["default"]();

    // write fragment back to URL when updated
    this.fragment.subscribe(function (fragment) {
        var encoded = fragment.replace(/[\s+&?=#\u007F-\uFFFF]+/g, encodeURIComponent);
        _storesUrlParameters2["default"].setParameter("f", encoded);
    });
}

DocumentOptions.prototype.toObject = function () {
    // Do not include url
    // (url is a required argument to Viewer.loadDocument, separated from other options)
    return {
        fragment: this.fragment(),
        userStyleSheet: [{
            text: "@page {" + this.pageSize.toCSSDeclarationString() + "}"
        }]
    };
};

exports["default"] = DocumentOptions;
module.exports = exports["default"];

},{"../stores/url-parameters":10,"./page-size":7,"knockout":1}],7:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _knockout = require("knockout");

var _knockout2 = _interopRequireDefault(_knockout);

var Mode = {
    AUTO: "auto",
    PRESET: "preset",
    CUSTOM: "custom"
};

var PresetSize = [{ name: "A5", description: "A5" }, { name: "A4", description: "A4" }, { name: "A3", description: "A3" }, { name: "B5", description: "B5 (ISO)" }, { name: "B4", description: "B4 (ISO)" }, { name: "JIS-B5", description: "B5 (JIS)" }, { name: "JIS-B4", description: "B4 (JIS)" }, { name: "letter", description: "letter" }, { name: "legal", description: "legal" }, { name: "ledger", description: "ledger" }];

function PageSize(pageSize) {
    this.mode = _knockout2["default"].observable(Mode.AUTO);
    this.presetSize = _knockout2["default"].observable(PresetSize[0]);
    this.isLandscape = _knockout2["default"].observable(false);
    this.customWidth = _knockout2["default"].observable("210mm");
    this.customHeight = _knockout2["default"].observable("297mm");
    this.isImportant = _knockout2["default"].observable(false);
    if (pageSize) {
        this.copyFrom(pageSize);
    }
}

PageSize.Mode = Mode;
PageSize.PresetSize = PageSize.prototype.PresetSize = PresetSize;

PageSize.prototype.copyFrom = function (other) {
    this.mode(other.mode());
    this.presetSize(other.presetSize());
    this.isLandscape(other.isLandscape());
    this.customWidth(other.customWidth());
    this.customHeight(other.customHeight());
    this.isImportant(other.isImportant());
};

PageSize.prototype.equivalentTo = function (other) {
    if (this.isImportant() !== other.isImportant()) {
        return false;
    }
    var mode = this.mode();
    if (other.mode() === mode) {
        switch (mode) {
            case Mode.AUTO:
                return true;
            case Mode.PRESET:
                return this.presetSize() === other.presetSize() && this.isLandscape() === other.isLandscape();
            case Mode.CUSTOM:
                return this.customWidth() === other.customWidth() && this.customHeight() === other.customHeight();
            default:
                throw new Error("Unknown mode " + mode);
        }
    } else {
        return false;
    }
};

PageSize.prototype.toCSSDeclarationString = function () {
    var declaration = "size: ";
    switch (this.mode()) {
        case Mode.AUTO:
            declaration += "auto";
            break;
        case Mode.PRESET:
            declaration += this.presetSize().name;
            if (this.isLandscape()) {
                declaration += " landscape";
            }
            break;
        case Mode.CUSTOM:
            declaration += this.customWidth() + " " + this.customHeight();
            break;
        default:
            throw new Error("Unknown mode " + this.mode());
    }

    if (this.isImportant()) {
        declaration += " !important";
    }

    return declaration + ";";
};

exports["default"] = PageSize;
module.exports = exports["default"];

},{"knockout":1}],8:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _knockout = require("knockout");

var _knockout2 = _interopRequireDefault(_knockout);

var _storesUrlParameters = require("../stores/url-parameters");

var _storesUrlParameters2 = _interopRequireDefault(_storesUrlParameters);

function getViewerOptionsFromURL() {
    return {
        profile: _storesUrlParameters2["default"].getParameter("profile") === "true",
        spreadView: _storesUrlParameters2["default"].getParameter("spread") === "true"
    };
}

function getDefaultValues() {
    return {
        fontSize: 16,
        profile: false,
        spreadView: false,
        zoom: 1
    };
}

function ViewerOptions(options) {
    this.fontSize = _knockout2["default"].observable();
    this.profile = _knockout2["default"].observable();
    this.spreadView = _knockout2["default"].observable();
    this.zoom = _knockout2["default"].observable();
    if (options) {
        this.copyFrom(options);
    } else {
        var defaultValues = getDefaultValues();
        var urlOptions = getViewerOptionsFromURL();
        this.fontSize(defaultValues.fontSize);
        this.profile(urlOptions.profile || defaultValues.profile);
        this.spreadView(urlOptions.spreadView || defaultValues.spreadView);
        this.zoom(defaultValues.zoom);
    }
}

ViewerOptions.prototype.copyFrom = function (other) {
    this.fontSize(other.fontSize());
    this.profile(other.profile());
    this.spreadView(other.spreadView());
    this.zoom(other.zoom());
};

ViewerOptions.prototype.toObject = function () {
    return {
        fontSize: this.fontSize(),
        spreadView: this.spreadView(),
        zoom: this.zoom()
    };
};

ViewerOptions.getDefaultValues = getDefaultValues;

exports["default"] = ViewerOptions;
module.exports = exports["default"];

},{"../stores/url-parameters":10,"knockout":1}],9:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
function Vivliostyle() {
    this.viewer = null;
    this.constants = null;
    this.profile = null;
}

Vivliostyle.prototype.setInstance = function (vivliostyle) {
    this.viewer = vivliostyle.viewer;
    this.constants = vivliostyle.constants;
    this.profile = vivliostyle.profile;
};

exports["default"] = new Vivliostyle();
module.exports = exports["default"];

},{}],10:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _utilsStringUtil = require("../utils/string-util");

var _utilsStringUtil2 = _interopRequireDefault(_utilsStringUtil);

function getRegExpForParameter(name) {
    return new RegExp("[#&]" + _utilsStringUtil2["default"].escapeUnicodeString(name) + "=([^&]*)");
}

function URLParameterStore() {
    this.history = window ? window.history : {};
    this.location = window ? window.location : { url: "" };
}

URLParameterStore.prototype.getParameter = function (name) {
    var url = this.location.href;
    var regexp = getRegExpForParameter(name);
    var r = url.match(regexp);
    if (r) {
        return r[1];
    } else {
        return null;
    }
};

URLParameterStore.prototype.setParameter = function (name, value) {
    var url = this.location.href;
    var updated;
    var regexp = getRegExpForParameter(name);
    var r = url.match(regexp);
    if (r) {
        var l = r[1].length;
        var start = r.index + r[0].length - l;
        updated = url.substring(0, start) + value + url.substring(start + l);
    } else {
        updated = url + (url.match(/#/) ? "&" : "#") + name + "=" + value;
    }
    if (this.history.replaceState) {
        this.history.replaceState(null, "", updated);
    } else {
        this.location.href = updated;
    }
};

exports["default"] = new URLParameterStore();
module.exports = exports["default"];

},{"../utils/string-util":13}],11:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

// cf. http://www.w3.org/TR/DOM-Level-3-Events-key/
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var Keys = {
    Unidentified: "Unidentified",
    ArrowDown: "ArrowDown",
    ArrowLeft: "ArrowLeft",
    ArrowRight: "ArrowRight",
    ArrowUp: "ArrowUp",
    Home: "Home",
    End: "End",
    PageDown: "PageDown",
    PageUp: "PageUp",
    Escape: "Escape"
};

// CAUTION: This function covers only part of common keys on a keyboard. Keys not covered by the implementation are identified as KeyboardEvent.key, KeyboardEvent.keyIdentifier, or "Unidentified".
function identifyKeyFromEvent(event) {
    var key = event.key;
    var keyIdentifier = event.keyIdentifier;
    var location = event.location;
    if (key === Keys.ArrowDown || key === "Down" || keyIdentifier === "Down") {
        return Keys.ArrowDown;
    } else if (key === Keys.ArrowLeft || key === "Left" || keyIdentifier === "Left") {
        return Keys.ArrowLeft;
    } else if (key === Keys.ArrowRight || key === "Right" || keyIdentifier === "Right") {
        return Keys.ArrowRight;
    } else if (key === Keys.ArrowUp || key === "Up" || keyIdentifier === "Up") {
        return Keys.ArrowUp;
    } else if (key === Keys.Escape || key === "Esc" || keyIdentifier === "U+001B") {
        return Keys.Escape;
    } else if (key === "0" || keyIdentifier === "U+0030") {
        return "0";
    } else if (key === "+" || key === "Add" || keyIdentifier === "U+002B" || keyIdentifier === "U+00BB" || keyIdentifier === "U+004B" && location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD /* workaround for Chrome for Windows */) {
            return "+";
        } else if (key === "-" || key === "Subtract" || keyIdentifier === "U+002D" || keyIdentifier === "U+00BD" || keyIdentifier === "U+004D" && location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD /* workaround for Chrome for Windows */) {
            return "-";
        } else {
        return key || keyIdentifier || Keys.Unidentified;
    }
}

exports["default"] = {
    Keys: Keys,
    identifyKeyFromEvent: identifyKeyFromEvent
};
module.exports = exports["default"];

},{}],12:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _knockout = require("knockout");

var _knockout2 = _interopRequireDefault(_knockout);

var util = {
    readonlyObservable: function readonlyObservable(value) {
        var obs = _knockout2["default"].observable(value);
        return {
            getter: _knockout2["default"].pureComputed(function () {
                return obs();
            }),
            value: obs
        };
    }
};

exports["default"] = util;
module.exports = exports["default"];

},{"knockout":1}],13:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
exports['default'] = {
    escapeUnicodeChar: function escapeUnicodeChar(ch) {
        return '\\u' + (0x10000 | ch.charCodeAt(0)).toString(16).substring(1);
    },
    escapeUnicodeString: function escapeUnicodeString(str) {
        return str.replace(/[^-a-zA-Z0-9_]/g, this.escapeUnicodeChar);
    }
};
module.exports = exports['default'];

},{}],14:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _knockout = require("knockout");

var _knockout2 = _interopRequireDefault(_knockout);

var _modelsVivliostyle = require("../models/vivliostyle");

var _modelsVivliostyle2 = _interopRequireDefault(_modelsVivliostyle);

var _modelsViewerOptions = require("../models/viewer-options");

var _modelsViewerOptions2 = _interopRequireDefault(_modelsViewerOptions);

var _utilsKeyUtil = require("../utils/key-util");

function Navigation(viewerOptions, viewer, settingsPanel) {
    this.viewerOptions_ = viewerOptions;
    this.viewer_ = viewer;
    this.settingsPanel_ = settingsPanel;

    this.isDisabled = _knockout2["default"].pureComputed(function () {
        return this.settingsPanel_.opened() || !this.viewer_.state.navigatable();
    }, this);
    this.isNavigateToPreviousDisabled = this.isDisabled;
    this.isNavigateToNextDisabled = this.isDisabled;
    this.isNavigateToLeftDisabled = this.isDisabled;
    this.isNavigateToRightDisabled = this.isDisabled;
    this.isNavigateToFirstDisabled = this.isDisabled;
    this.isNavigateToLastDisabled = this.isDisabled;
    this.isZoomOutDisabled = this.isDisabled;
    this.isZoomInDisabled = this.isDisabled;
    this.isZoomDefaultDisabled = this.isDisabled;
    this.isIncreaseFontSizeDisabled = this.isDisabled;
    this.isDecreaseFontSizeDisabled = this.isDisabled;
    this.isDefaultFontSizeDisabled = this.isDisabled;

    ["navigateToPrevious", "navigateToNext", "navigateToLeft", "navigateToRight", "navigateToFirst", "navigateToLast", "zoomIn", "zoomOut", "zoomDefault", "increaseFontSize", "decreaseFontSize", "defaultFontSize", "handleKey"].forEach(function (methodName) {
        this[methodName] = this[methodName].bind(this);
    }, this);
}

Navigation.prototype.navigateToPrevious = function () {
    if (!this.isNavigateToPreviousDisabled()) {
        this.viewer_.navigateToPrevious();
        return true;
    } else {
        return false;
    }
};

Navigation.prototype.navigateToNext = function () {
    if (!this.isNavigateToNextDisabled()) {
        this.viewer_.navigateToNext();
        return true;
    } else {
        return false;
    }
};

Navigation.prototype.navigateToLeft = function () {
    if (!this.isNavigateToLeftDisabled()) {
        this.viewer_.navigateToLeft();
        return true;
    } else {
        return false;
    }
};

Navigation.prototype.navigateToRight = function () {
    if (!this.isNavigateToRightDisabled()) {
        this.viewer_.navigateToRight();
        return true;
    } else {
        return false;
    }
};

Navigation.prototype.navigateToFirst = function () {
    if (!this.isNavigateToFirstDisabled()) {
        this.viewer_.navigateToFirst();
        return true;
    } else {
        return false;
    }
};

Navigation.prototype.navigateToLast = function () {
    if (!this.isNavigateToLastDisabled()) {
        this.viewer_.navigateToLast();
        return true;
    } else {
        return false;
    }
};

Navigation.prototype.zoomIn = function () {
    if (!this.isZoomInDisabled()) {
        var zoom = this.viewerOptions_.zoom();
        this.viewerOptions_.zoom(zoom * 1.25);
        return true;
    } else {
        return false;
    }
};

Navigation.prototype.zoomOut = function () {
    if (!this.isZoomOutDisabled()) {
        var zoom = this.viewerOptions_.zoom();
        this.viewerOptions_.zoom(zoom * 0.8);
        return true;
    } else {
        return false;
    }
};

Navigation.prototype.zoomDefault = function (force) {
    if (force === true || !this.isZoomDefaultDisabled()) {
        var zoom = this.viewer_.queryZoomFactor(_modelsVivliostyle2["default"].viewer.ZoomType.FIT_INSIDE_VIEWPORT);
        this.viewerOptions_.zoom(zoom);
        return true;
    } else {
        return false;
    }
};

Navigation.prototype.increaseFontSize = function () {
    if (!this.isIncreaseFontSizeDisabled()) {
        var fontSize = this.viewerOptions_.fontSize();
        this.viewerOptions_.fontSize(fontSize * 1.25);
        return true;
    } else {
        return false;
    }
};

Navigation.prototype.decreaseFontSize = function () {
    if (!this.isDecreaseFontSizeDisabled()) {
        var fontSize = this.viewerOptions_.fontSize();
        this.viewerOptions_.fontSize(fontSize * 0.8);
        return true;
    } else {
        return false;
    }
};

Navigation.prototype.defaultFontSize = function () {
    if (!this.isDefaultFontSizeDisabled()) {
        var fontSize = _modelsViewerOptions2["default"].getDefaultValues().fontSize;
        this.viewerOptions_.fontSize(fontSize);
        return true;
    } else {
        return false;
    }
};

Navigation.prototype.handleKey = function (key) {
    switch (key) {
        case _utilsKeyUtil.Keys.ArrowDown:
        case _utilsKeyUtil.Keys.PageDown:
            return !this.navigateToNext();
        case _utilsKeyUtil.Keys.ArrowLeft:
            return !this.navigateToLeft();
        case _utilsKeyUtil.Keys.ArrowRight:
            return !this.navigateToRight();
        case _utilsKeyUtil.Keys.ArrowUp:
        case _utilsKeyUtil.Keys.PageUp:
            return !this.navigateToPrevious();
        case _utilsKeyUtil.Keys.Home:
            return !this.navigateToFirst();
        case _utilsKeyUtil.Keys.End:
            return !this.navigateToLast();
        case "+":
            return !this.increaseFontSize();
        case "-":
            return !this.decreaseFontSize();
        case "0":
            return !this.defaultFontSize();
        default:
            return true;
    }
};

exports["default"] = Navigation;
module.exports = exports["default"];

},{"../models/viewer-options":8,"../models/vivliostyle":9,"../utils/key-util":11,"knockout":1}],15:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _knockout = require("knockout");

var _knockout2 = _interopRequireDefault(_knockout);

var _modelsViewerOptions = require("../models/viewer-options");

var _modelsViewerOptions2 = _interopRequireDefault(_modelsViewerOptions);

var _modelsPageSize = require("../models/page-size");

var _modelsPageSize2 = _interopRequireDefault(_modelsPageSize);

var _utilsKeyUtil = require("../utils/key-util");

function SettingsPanel(viewerOptions, documentOptions, viewer) {
    this.viewerOptions_ = viewerOptions;
    this.documentOptions_ = documentOptions;
    this.viewer_ = viewer;

    this.opened = _knockout2["default"].observable(false);
    this.state = {
        viewerOptions: new _modelsViewerOptions2["default"](viewerOptions),
        pageSize: new _modelsPageSize2["default"](documentOptions.pageSize)
    };

    ["close", "toggle", "apply", "reset"].forEach(function (methodName) {
        this[methodName] = this[methodName].bind(this);
    }, this);
}

SettingsPanel.prototype.close = function () {
    this.opened(false);
};

SettingsPanel.prototype.toggle = function () {
    this.opened(!this.opened());
};

SettingsPanel.prototype.apply = function () {
    if (this.state.pageSize.equivalentTo(this.documentOptions_.pageSize)) {
        this.viewerOptions_.copyFrom(this.state.viewerOptions);
    } else {
        this.documentOptions_.pageSize.copyFrom(this.state.pageSize);
        this.viewer_.loadDocument(this.documentOptions_, this.state.viewerOptions);
    }
};

SettingsPanel.prototype.reset = function () {
    this.state.viewerOptions.copyFrom(this.viewerOptions_);
    this.state.pageSize.copyFrom(this.documentOptions_.pageSize);
};

SettingsPanel.prototype.handleKey = function (key) {
    switch (key) {
        case _utilsKeyUtil.Keys.Escape:
            this.close();
            return true;
        default:
            return true;
    }
};

exports["default"] = SettingsPanel;
module.exports = exports["default"];

},{"../models/page-size":7,"../models/viewer-options":8,"../utils/key-util":11,"knockout":1}],16:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _knockout = require("knockout");

var _knockout2 = _interopRequireDefault(_knockout);

var _modelsVivliostyle = require("../models/vivliostyle");

var _modelsVivliostyle2 = _interopRequireDefault(_modelsVivliostyle);

var _modelsDocumentOptions = require("../models/document-options");

var _modelsDocumentOptions2 = _interopRequireDefault(_modelsDocumentOptions);

var _modelsViewerOptions = require("../models/viewer-options");

var _modelsViewerOptions2 = _interopRequireDefault(_modelsViewerOptions);

var _viewer = require("./viewer");

var _viewer2 = _interopRequireDefault(_viewer);

var _navigation = require("./navigation");

var _navigation2 = _interopRequireDefault(_navigation);

var _settingsPanel = require("./settings-panel");

var _settingsPanel2 = _interopRequireDefault(_settingsPanel);

var _utilsKeyUtil = require("../utils/key-util");

var _utilsKeyUtil2 = _interopRequireDefault(_utilsKeyUtil);

function ViewerApp() {
    this.documentOptions = new _modelsDocumentOptions2["default"]();
    this.viewerOptions = new _modelsViewerOptions2["default"]();
    if (this.viewerOptions.profile()) {
        _modelsVivliostyle2["default"].profile.profiler.enable();
    }
    this.viewerSettings = {
        userAgentRootURL: "resources/",
        viewportElement: document.getElementById("vivliostyle-viewer-viewport")
    };
    this.viewer = new _viewer2["default"](this.viewerSettings, this.viewerOptions);
    this.settingsPanel = new _settingsPanel2["default"](this.viewerOptions, this.documentOptions, this.viewer);
    this.navigation = new _navigation2["default"](this.viewerOptions, this.viewer, this.settingsPanel);

    this.handleKey = (function (data, event) {
        var key = _utilsKeyUtil2["default"].identifyKeyFromEvent(event);
        var ret = this.settingsPanel.handleKey(key);
        if (ret) {
            ret = this.navigation.handleKey(key);
        }
        return ret;
    }).bind(this);

    this.setDefaultView();

    this.viewer.loadDocument(this.documentOptions);
}

ViewerApp.prototype.setDefaultView = function () {
    var status = this.viewer.state.status();
    this.viewer.state.status.subscribe(function (newStatus) {
        var finished = false;
        var oldStatus = status;
        status = newStatus;
        if (oldStatus === "loading" && newStatus === "complete") {
            // After document loaded, zoom to the default size
            finished = this.navigation.zoomDefault(true);
        } else if (newStatus === "loading") {
            finished = false;
        }
    }, this);
};

exports["default"] = ViewerApp;
module.exports = exports["default"];

},{"../models/document-options":6,"../models/viewer-options":8,"../models/vivliostyle":9,"../utils/key-util":11,"./navigation":14,"./settings-panel":15,"./viewer":17,"knockout":1}],17:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _knockout = require("knockout");

var _knockout2 = _interopRequireDefault(_knockout);

var _utilsObservableUtil = require("../utils/observable-util");

var _utilsObservableUtil2 = _interopRequireDefault(_utilsObservableUtil);

var _loggingLogger = require("../logging/logger");

var _loggingLogger2 = _interopRequireDefault(_loggingLogger);

var _modelsVivliostyle = require("../models/vivliostyle");

var _modelsVivliostyle2 = _interopRequireDefault(_modelsVivliostyle);

function Viewer(viewerSettings, viewerOptions) {
    this.viewerOptions_ = viewerOptions;
    this.documentOptions_ = null;
    this.viewer_ = new _modelsVivliostyle2["default"].viewer.Viewer(viewerSettings, viewerOptions.toObject());
    var state_ = this.state_ = {
        status: _utilsObservableUtil2["default"].readonlyObservable("loading"),
        pageProgression: _utilsObservableUtil2["default"].readonlyObservable(_modelsVivliostyle2["default"].constants.LTR)
    };
    this.state = {
        status: state_.status.getter,
        navigatable: _knockout2["default"].pureComputed(function () {
            return state_.status.value() === "complete";
        }),
        pageProgression: state_.pageProgression.getter
    };

    this.setupViewerEventHandler();
    this.setupViewerOptionSubscriptions();
}

Viewer.prototype.setupViewerEventHandler = function () {
    this.viewer_.addListener("error", function (payload) {
        _loggingLogger2["default"].error(payload.content);
    });
    this.viewer_.addListener("resizestart", (function () {
        var status = this.state.status();
        if (status === "complete") {
            this.state_.status.value("resizing");
        }
    }).bind(this));
    this.viewer_.addListener("resizeend", (function () {
        this.state_.status.value("complete");
    }).bind(this));
    this.viewer_.addListener("loaded", (function () {
        this.state_.pageProgression.value(this.viewer_.getCurrentPageProgression());
        this.state_.status.value("complete");
        if (this.viewerOptions_.profile()) {
            _modelsVivliostyle2["default"].profile.profiler.printTimings();
        }
    }).bind(this));
    this.viewer_.addListener("nav", (function (payload) {
        var cfi = payload.cfi;
        if (cfi) {
            this.documentOptions_.fragment(cfi);
        }
    }).bind(this));
    this.viewer_.addListener("hyperlink", (function (payload) {
        if (payload.internal) {
            this.viewer_.navigateToInternalUrl(payload.href);
        } else {
            window.location.href = payload.href;
        }
    }).bind(this));
};

Viewer.prototype.setupViewerOptionSubscriptions = function () {
    _knockout2["default"].computed(function () {
        var viewerOptions = this.viewerOptions_.toObject();
        if (this.state.status.peek() === "complete") {
            this.viewer_.setOptions(viewerOptions);
        }
    }, this).extend({ rateLimit: 0 });
};

Viewer.prototype.loadDocument = function (documentOptions, viewerOptions) {
    this.state_.status.value("loading");
    if (viewerOptions) {
        this.viewerOptions_.copyFrom(viewerOptions);
    }
    this.documentOptions_ = documentOptions;
    if (documentOptions.url()) {
        this.viewer_.loadDocument(documentOptions.url(), documentOptions.toObject(), this.viewerOptions_.toObject());
    } else if (documentOptions.epubUrl()) {
        this.viewer_.loadEPUB(documentOptions.epubUrl(), documentOptions.toObject(), this.viewerOptions_.toObject());
    }
};

Viewer.prototype.navigateToPrevious = function () {
    this.viewer_.navigateToPage("previous");
};

Viewer.prototype.navigateToNext = function () {
    this.viewer_.navigateToPage("next");
};

Viewer.prototype.navigateToLeft = function () {
    this.viewer_.navigateToPage("left");
};

Viewer.prototype.navigateToRight = function () {
    this.viewer_.navigateToPage("right");
};

Viewer.prototype.navigateToFirst = function () {
    this.viewer_.navigateToPage("first");
};

Viewer.prototype.navigateToLast = function () {
    this.viewer_.navigateToPage("last");
};

Viewer.prototype.queryZoomFactor = function (type) {
    return this.viewer_.queryZoomFactor(type);
};

exports["default"] = Viewer;
module.exports = exports["default"];

},{"../logging/logger":4,"../models/vivliostyle":9,"../utils/observable-util":12,"knockout":1}],18:[function(require,module,exports){
/*
 * Copyright 2015 Vivliostyle Inc.
 *
 * This file is part of Vivliostyle UI.
 *
 * Vivliostyle UI is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Vivliostyle UI is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Vivliostyle UI.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _knockout = require("knockout");

var _knockout2 = _interopRequireDefault(_knockout);

var _bindingsMenuButtonJs = require("./bindings/menuButton.js");

var _bindingsMenuButtonJs2 = _interopRequireDefault(_bindingsMenuButtonJs);

var _viewmodelsViewerApp = require("./viewmodels/viewer-app");

var _viewmodelsViewerApp2 = _interopRequireDefault(_viewmodelsViewerApp);

exports["default"] = {
    start: function start() {
        function startViewer() {
            _knockout2["default"].applyBindings(new _viewmodelsViewerApp2["default"]());
        }

        if (window["__loaded"]) startViewer();else window.onload = startViewer;
    }
};
module.exports = exports["default"];

},{"./bindings/menuButton.js":3,"./viewmodels/viewer-app":16,"knockout":1}]},{},[5]);