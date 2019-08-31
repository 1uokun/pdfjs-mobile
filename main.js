var UI = {
    PAGE_TEMPLATE:'<div class="page swiper-slide" data-loaded="false">' +
                    '<div class="canvasWrapper">' +
                        '<canvas></canvas>' +
                    '</div>' +
                  '</div>'
};
/**
 * Create a new page to be appended to the DOM.
 *
 * @param {Number} pageNumber The page number that is being created
 * @return {HTMLElement}
 */
UI.createPage = function(pageNumber){
    var temp = document.createElement('div');
    temp.innerHTML = this.PAGE_TEMPLATE;

    var page = temp.children[0];
    var canvas = page.querySelector('canvas');

    page.setAttribute('id', 'pageContainer'+pageNumber);
    page.setAttribute('data-page-number', pageNumber);

    canvas.mozOpaque = true;
    canvas.setAttribute('id', 'page'+pageNumber);

    return page;
};

/**
 * Render a page that has already been created.
 *
 * @param {Number} pageNumber The page number to be rendered
 * @param {Object} pdf The options for rendering
 * @param {Function} callback
 * @return {Promise} Settled once rendering has comple ted
 *  A settled Promise will be either:
 *    - fulfilled: [pdfPage, annotations]
 *    - rejected: Error
 */
UI.renderPage = function(pageNumber, pdf, callback){
    var self = this;
    pdf.getPage(pageNumber).then(function(pdfPage){
        var page = document.getElementById('pageContainer'+pageNumber);
        var canvas = page.querySelector('.canvasWrapper canvas');
        var canvasContext = canvas.getContext('2d', {alpha: false});
        var desiredWidth = window.innerWidth  || document.body.clientWidth;
        var _viewport = pdfPage.getViewport({ scale: 1 });
        var _scale = (desiredWidth*0.99) / _viewport.width;
        var viewport = pdfPage.getViewport({ scale: _scale, });

        var transform = self.scalePage(pageNumber, viewport, canvasContext);
        pdfPage.render({ canvasContext:canvasContext, viewport:viewport, transform:transform }).then(function(){
            page.setAttribute('data-loaded', 'true');
            callback&&callback(pdfPage)
        });
    })
};

/**
 * Destroy the invisible pages
 *
 * @params {Number} The page which will be destroy
 * **/
UI.destroyPage = function(page){
    if(document.getElementById('pageContainer'+page).dataset.loaded === "true"){
        var _canvas = document.getElementById('pageContainer'+page).children[0].children[0];
        _canvas.getContext('2d').clearRect(0,0,_canvas.width,_canvas.height);
        document.getElementById('pageContainer'+page).dataset.loaded = "false"
    }
};

/**
 * Scale the elements of a page.
 *
 * @param {Number} pageNumber The page number to be scaled
 * @param {Object} viewport The viewport of the PDF page (see pdfPage.getViewport(scale, rotate))
 * @param {Object} context The canvas context that the PDF page is rendered to
 * @return {Array} The transform data for rendering the PDF page
 */
UI.scalePage = function(pageNumber, viewport, context){
    var page = document.getElementById('pageContainer'+pageNumber);
    var canvas = page.querySelector('.canvasWrapper canvas');
    var wrapper = page.querySelector('.canvasWrapper');
    var outputScale = getOutputScale(context);
    var transform = !outputScale.scaled ? null : [outputScale.sx, 0, 0, outputScale.sy, 0, 0];
    var sfx = approximateFraction(outputScale.sx);
    var sfy = approximateFraction(outputScale.sy);

    canvas.width = roundToDivide(viewport.width * outputScale.sx, sfx[0]);
    canvas.height = roundToDivide(viewport.height * outputScale.sy, sfy[0]);
    canvas.style.width = roundToDivide(viewport.width, sfx[1]) + 'px';
    canvas.style.height = roundToDivide(viewport.height, sfx[1]) + 'px';
    wrapper.style.width = viewport.width+'px';
    wrapper.style.height = viewport.height+'px';

    return transform;
};

/**
* Get translate3d values of a div
*
* @param {Element} el like a #viewer in swiper
* **/
UI.getTranslate = function(el) {
    var results = (el.style.webkitTransform || el.style.transform).match(/^translate3d\((.*?)px.*\)$/);
    if (Array.isArray(results) && !!Number(results[1])) {
        return Math.abs(results[1])
    }
};

/**
 * The following methods are taken from mozilla/pdf.js and as such fall under
 * the Apache License (http://www.apache.org/licenses/).
 *
 * Original source can be found at mozilla/pdf.js:
 * https://github.com/mozilla/pdf.js/blob/master/web/ui_utils.js
 */

/**
 * Approximates a float number as a fraction using Farey sequence (max order
 * of 8).
 *
 * @param {Number} x Positive float number
 * @return {Array} Estimated fraction: the first array item is a numerator,
 *                 the second one is a denominator.
 */
function approximateFraction(x) {
    // Fast path for int numbers or their inversions.
    if (Math.floor(x) === x) {
        return [x, 1];
    }

    const xinv = 1 / x;
    const limit = 8;
    if (xinv > limit) {
        return [1, limit];
    } else if (Math.floor(xinv) === xinv) {
        return [1, xinv];
    }

    const x_ = x > 1 ? xinv : x;

    // a/b and c/d are neighbours in Farey sequence.
    var a = 0, b = 1, c = 1, d = 1;

    // Limit search to order 8.
    while (true) {
        // Generating next term in sequence (order of q).
        var p = a + c, q = b + d;
        if (q > limit) {
            break;
        }
        if (x_ <= p / q) {
            c = p; d = q;
        } else {
            a = p; b = q;
        }
    }

    // Select closest of neighbours to x.
    if (x_ - a / b < c / d - x_) {
        return x_ === x ? [a, b] : [b, a];
    } else {
        return x_ === x ? [c, d] : [d, c];
    }
}

function getOutputScale(ctx) {
    var devicePixelRatio = window.devicePixelRatio || 1;
    var backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
        ctx.mozBackingStorePixelRatio ||
        ctx.msBackingStorePixelRatio ||
        ctx.oBackingStorePixelRatio ||
        ctx.backingStorePixelRatio || 1;
    var pixelRatio = devicePixelRatio / backingStoreRatio;
    return {
        sx: pixelRatio,
        sy: pixelRatio,
        scaled: pixelRatio !== 1
    };
}

function roundToDivide(x, div) {
    var r = x % div;
    return r === 0 ? x : Math.round(x - r + div);
}
