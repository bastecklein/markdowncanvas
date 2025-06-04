import markdownit from "markdown-it";

let mit = new markdownit();
mit.validateLink = function() {
    // Disable link validation to allow any URL
    return true;
};

let internalImageRef = {};

export function markdownToCanvas(markdown, canvas, options) {

    const renderCanvas = document.createElement("canvas");
    const renderContext = renderCanvas.getContext("2d");

    renderContext.textBaseline = "top";

    renderCanvas.height = canvas.height;
    renderCanvas.width = canvas.width;

    const lineCanvas = document.createElement("canvas");
    const lineContext = lineCanvas.getContext("2d");

    lineContext.textBaseline = "top";

    lineCanvas.height = canvas.height;
    lineCanvas.width = canvas.width;

    const order = {
        useBreaks: options.useBreaks || true,
        baseSize: options.baseSize || 14,
        curFont: options.font || "serif",
        curSize: options.baseSize || 14,
        curWeight: "normal",
        curItalic: false,
        curX: 0,
        curY: 0,
        curText: markdown,
        scale: options.scale || 1,
        context: renderContext,
        canvas: renderCanvas,
        lineContext: lineContext,
        lineCanvas: lineCanvas,
        margin: options.margin || 0,
        backgroundColor: options.backgroundColor || null,
        textColor: options.textColor || null,
        headerColor: options.headerColor || null,
        backgroundImage: options.backgroundImage || null,
        curMargin: {
            top: options.margin || 0,
            bottom: options.margin || 0,
            left: options.margin || 0,
            right: options.margin || 0
        },
        inBlockquote: false,
        isHeading: false,
        lastY: 0,
        embeddedImages: options.embeddedImages || {},
        lastLineHeight: 0,
        textAlign: options.textAlign || "left",
        maxImageHeight: options.maxImageHeight || 512,
        curIndent: 0
    };

    order.curMargin.left = order.curMargin.left * order.scale;
    order.curMargin.right = order.curMargin.right * order.scale;
    order.curMargin.top = order.curMargin.top * order.scale;
    order.curMargin.bottom = order.curMargin.bottom * order.scale;

    order.margin = order.margin * order.scale;
    order.maxImageHeight = order.maxImageHeight * order.scale;

    order.curY = 0;
    order.curX = 0;

    const instructions = mit.parse(markdown, {});

    console.log(instructions);
    console.log(order);

    for(let i = 0; i < instructions.length; i++) {
        const inst = instructions[i];
        renderInstruction(order, inst);
    }

    const context = canvas.getContext("2d");

    if(options.backgroundColor && options.backgroundColor.trim().length == 7) {
        context.fillStyle = options.backgroundColor;
        context.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        context.clearRect(0, 0, canvas.width, canvas.height);
    }

    let bgImg = null;

    if(options.backgroundImage) {
        if(options.backgroundImage.startsWith("http:") || options.backgroundImage.startsWith("https:") || options.backgroundImage.startsWith("data:")) {
            bgImg = internalImageRef[options.backgroundImage];

            if(!bgImg) {
                bgImg = null;

                loadImage(options.backgroundImage, function() {
                    markdownToCanvas(markdown, canvas, options);
                });
            }
        }
    }

    if(bgImg) {
        if(bgImg.width == canvas.width && bgImg.h == canvas.height) {
            context.drawImage(bgImg, 0, 0);
        } else {
            const ratio = bgImg.width / canvas.width;
            const oh = Math.ceil(bgImg.height / ratio);
    
            if(oh >= canvas.height) {
                const dy = Math.floor(canvas.height / 2 - oh / 2);
                context.drawImage(bgImg, 0, dy, canvas.width, oh);
            } else {
                const rat2 = bgImg.height / canvas.height;
                const ow = Math.ceil(bgImg.width / rat2);
                const dx = Math.floor(canvas.width / 2 - ow / 2);

                context.drawImage(bgImg, dx, 0, ow, canvas.height);
            }
        }    
    }

    let dy = order.margin;

    if(options.verticalAlign == "center") {
        dy = ((canvas.height - order.curY) / 2) - (order.margin / 2);
    }

    if(options.verticalAlign == "bottom") {
        dy = (canvas.height - order.curY) - order.margin;
    }

    context.drawImage(renderCanvas, 0, Math.floor(dy));
}

function renderInstruction(instance, instruction) {

    if(instruction.children && instruction.children.length > 0) {

        if(instruction.type == "image" && instruction.attrs && instruction.attrs.length > 0 && instruction.children.length == 1) {
            // we should ignore the children of an image instruction
        } else {
            for(let i = 0; i < instruction.children.length; i++) {
                const child = instruction.children[i];
                renderInstruction(instance, child);
            }

            return;
        }
    }

    if(instruction.block) {
        conductNewLine(instance);
    }

    const lineHeight = (instance.curSize + 2) * instance.scale;

    const canvas = instance.lineCanvas;
    const context = instance.lineContext;

    const renderWidth = Math.floor(canvas.width - (instance.curMargin.left + instance.curMargin.right));

    let fillColor = null;

    if(instance.textColor && instance.textColor.trim().length == 7) {
        fillColor = instance.textColor;
    }

    if(instance.isHeading) {
        if(instance.headerColor && instance.headerColor.trim().length == 7) {
            fillColor = instance.headerColor;
        }
    }

    if(instruction.type) {
        if(instruction.type == "heading_open") {

            instance.isHeading = true;

            instance.curSize = instance.baseSize;
            instance.curWeight = "bold";

            if(instruction.tag) {
                if(instruction.tag == "h1") {
                    instance.curSize = Math.round(instance.baseSize * 2.5);
                }

                if(instruction.tag == "h2") {
                    instance.curSize = Math.round(instance.baseSize * 2.0);
                }

                if(instruction.tag == "h3") {
                    instance.curSize = Math.round(instance.baseSize * 1.5);
                }

                if(instruction.tag == "h4") {
                    instance.curSize = Math.round(instance.baseSize * 1.25);
                }

                if(instruction.tag == "h5") {
                    instance.curSize = Math.round(instance.baseSize * 1.0);
                }
            }

            return;
        }

        if(instruction.type == "heading_close") {
            instance.curSize = instance.baseSize;
            instance.curWeight = "normal";
            instance.isHeading = false;

            notifyLineHeight(instance, instance.lastLineHeight + Math.round(12 * instance.scale));

            return;
        }


        if(instruction.type == "paragraph_close") {
            notifyLineHeight(instance, instance.lastLineHeight + Math.round(8 * instance.scale));
            return;
        }

        if(instruction.type == "hr") {

            let lineColor = null;

            if(instance.textColor && instance.textColor.trim().length == 7) {
                lineColor = instance.textColor;
            }

            if(lineColor && lineColor.trim().length == 7) {
                context.strokeStyle = lineColor;
            }

            context.lineWidth = instance.scale * 1.5;

            const yPos = Math.floor(instance.lastY);

            context.beginPath();
            context.moveTo(0, yPos);
            context.lineTo(renderWidth, yPos);
            context.stroke();

            notifyLineHeight(instance, instance.lastLineHeight + Math.round(8 * instance.scale));

            return;
        }

        if(instruction.type == "softbreak") {
            if(instance.useBreaks) {
                conductNewLine(instance);
            }
            
            return;
        }

        if(instruction.type == "hardbreak") {
            conductNewLine(instance);
            return;
        }

        if(instruction.type == "strong_open") {
            instance.curWeight = "bold";
            return;
        }

        if(instruction.type == "strong_close") {
            instance.curWeight = "normal";
            return;
        }

        if(instruction.type == "em_open") {
            instance.curItalic = true;
            return;
        }

        if(instruction.type == "em_close") {
            instance.curItalic = false;
            return;
        }

        if(instruction.type == "list_item_open") {

            context.textBaseline = "top";

            const indentSize = Math.round(20 * instance.scale);
            context.fillText("•", instance.curIndent, instance.curY);
            instance.curX += indentSize;
            instance.curIndent += indentSize;
            return;
        }

        if(instruction.type == "list_item_close") {
            const indentSize = Math.round(20 * instance.scale);
            instance.curIndent -= indentSize;
            return;
        }

        if(instruction.type == "blockquote_open") {
            instance.inBlockquote = true;

            instance.lastLineHeight = Math.round(12 * instance.scale);
            conductNewLine(instance);

            return;
        }

        if(instruction.type == "blockquote_close") {
            instance.inBlockquote = false;

            instance.lastLineHeight = Math.round(8 * instance.scale);
            conductNewLine(instance);

            return;
        }

        if(instruction.type == "image") {

            let src = null;

            if(instruction.attrs && instruction.attrs.length > 0) {

                for(let j = 0; j < instruction.attrs.length; j++) {
                    const attr = instruction.attrs[j];

                    if(attr[0] == "src") {
                        src = attr[1];
                    }
                }

                if(src) {
                    renderInlineImage(instance, src, context);
                }

            }

            return;
        }
    }

    if(instruction.content.startsWith("<!--") && instruction.content.endsWith("-->")) {
        // This is a comment, skip it
        return;
    }

    if(instruction.content.startsWith("[comment]:")) {
        // This is a comment, skip it
        return;
    }

    if(instruction.content.startsWith("![") && instruction.content.endsWith("]")) {
        // inline image without alt text
        const src = instruction.content.substring(2, instruction.content.length - 1).trim();
        renderInlineImage(instance, src, context);
        return;
    }


    context.fillStyle = fillColor;

    let ital = "";

    if(instance.curItalic) {
        ital = "italic ";
    }

    context.font = ital + instance.curWeight + " " + (instance.curSize * instance.scale) + "px " + instance.curFont;

    if(instruction.content && instruction.content.trim().length > 0) {

        const words = instruction.content.split(" ");

        for(let i = 0; i < words.length; i++) {
            let word = words[i];

            if(i < words.length - 1) {
                word += " ";
            }

            const metrics = context.measureText(word);

            if(instance.curX + metrics.width > renderWidth) {
                conductNewLine(instance);
            }

            if(word && word.trim().length > 0) {
                notifyLineHeight(instance, lineHeight);
            }
            

            if(instance.inBlockquote && instance.curX == 0) {
                instance.curX += Math.round(canvas.width * 0.045);
            }

            context.fillStyle = fillColor;

            context.textBaseline = "top";

            context.fillText(word, instance.curX, instance.curY);

            instance.curX += metrics.width;
        }
    }
}

function notifyLineHeight(instance, height) {
    if(height > instance.lastLineHeight) {
        instance.lastLineHeight = height;
    }
}

function conductNewLine(instance) {
    
    if(instance.lastLineHeight > 0) {
        if(instance.inBlockquote) {
            instance.context.fillStyle = "rgba(130, 130, 130, 0.15)";
            instance.context.fillRect(instance.curMargin.left, instance.curY, instance.canvas.width - (instance.curMargin.left + instance.curMargin.right), instance.lastLineHeight);

            instance.context.fillStyle = "rgba(130, 130, 130, 0.25)";
            instance.context.fillRect(instance.curMargin.left, instance.curY, Math.round(instance.canvas.width * 0.015), instance.lastLineHeight);
        }
    }

    let dx = instance.curMargin.left;

    if(instance.textAlign && instance.textAlign == "center") {
        const contentWidth = instance.curX;
        const midCanvas = instance.canvas.width / 2;
        const midContent = contentWidth / 2;
        dx = Math.floor(midCanvas - midContent);
    }

    instance.context.drawImage(instance.lineCanvas, dx, 0);
    instance.lineContext.clearRect(0, 0, instance.lineCanvas.width, instance.lineCanvas.height);
    
    instance.lastY = instance.curY;
    instance.curY += instance.lastLineHeight;
    instance.curX = instance.curIndent;
    instance.lastLineHeight = 0; 
}

export function wrapText(ctx, text, maxWidth) {
    const words = text.split(" ");
    let line = "";

    let lines = [];

    for (const [index, w] of words.entries()) {
        const newTx = w + " ";
        const testLine = line + newTx;
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;

        if (testWidth > maxWidth && index > 0) {
            lines.push(line);
            line = newTx;
        } else {
            line = testLine;
        }
    }

    lines.push(line);
    
    return lines;
}

function loadImage(url, callback) {
    const imgOb = new Image();
    imgOb.onload = function() {
        internalImageRef[url] = imgOb;
        
        if(callback) {
            callback();
        }
    };
    imgOb.src = url;
}

function renderInlineImage(instance, src, context) {
    if(!src.startsWith("http:") && !src.startsWith("https:") && !src.startsWith("data:")) {
        if(instance.embeddedImages && instance.embeddedImages[src]) {
            src = instance.embeddedImages[src];
        } else {
            src = null;
        }
    }

    if(src) {
        const imgOb = internalImageRef[src];

        if(imgOb) {
            let imgWidth = Math.floor(imgOb.width * instance.scale);
            let imgHeight = Math.floor(imgOb.height * instance.scale);

            if(imgHeight > instance.maxImageHeight) {
                const ratio = imgWidth / imgHeight;
                imgHeight = instance.maxImageHeight;
                imgWidth = Math.floor(imgHeight * ratio);
            }

            context.drawImage(imgOb, instance.curX, instance.curY, imgWidth, imgHeight);

            instance.curX += imgWidth;

            notifyLineHeight(instance, imgHeight);
        } else {
            loadImage(src, function() {
                markdownToCanvas(instance.curText, instance.canvas, instance);
            });
        }

        return;
    }
}