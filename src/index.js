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
        lastLineHeight: 0
    };

    order.curMargin.left = order.curMargin.left * order.scale;
    order.curMargin.right = order.curMargin.right * order.scale;
    order.curMargin.top = order.curMargin.top * order.scale;
    order.curMargin.bottom = order.curMargin.bottom * order.scale;

    order.margin = order.margin * order.scale;
    order.curY = (order.curSize * order.scale) + order.margin;
    order.curX = order.margin;

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

    let dy = 0;

    if(options.verticalAlign == "center") {
        dy = ((canvas.height - order.curY) / 2) - (order.margin / 2);
    }

    if(options.verticalAlign == "bottom") {
        dy = (canvas.height - order.curY) - order.margin;
    }

    context.drawImage(renderCanvas, 0, Math.floor(dy));
}

function renderInstruction(instance, instruction) {

    if(instruction.block) {
        conductNewLine(instance);
    }

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

    const lineHeight = (instance.curSize + 2) * instance.scale;

    const canvas = instance.canvas;
    const context = instance.context;

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
            return;
        }


        if(instruction.type == "paragraph_close") {
            notifyLineHeight(instance, instance.lastLineHeight + Math.round(8 * instance.scale));
            return;
        }

        if(instruction.type == "hr") {

            context.lineWidth = instance.scale;

            /*
            const yDiff = instance.curY - instance.lastY;
            const halfDiff = Math.floor(yDiff / 2);*/

            let yPos = Math.floor(instance.lastY);

            context.beginPath();
            context.moveTo(instance.margin, yPos);
            context.lineTo(renderWidth, yPos);
            context.stroke();
            return;
        }

        if(instruction.type == "softbreak") {
            if(instance.useBreaks) {
                notifyLineHeight(instance, lineHeight);
            }
            
            return;
        }

        if(instruction.type == "hardbreak") {
            notifyLineHeight(instance, lineHeight);
            
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

            instance.curMargin.left += instance.scale * 20;
            context.fillText("•", instance.curX, instance.curY);
            instance.curX += instance.scale * 20;
            return;
        }

        if(instruction.type == "list_item_close") {
            instance.curMargin.left = instance.margin;
            return;
        }

        if(instruction.type == "blockquote_open") {
            instance.inBlockquote = true;

            const quotePadding = Math.round(lineHeight / 2);

            /*
            context.fillStyle = "rgba(130, 130, 130, 0.15)";
            context.fillRect(instance.curX, instance.curY - lineHeight, canvas.width - (instance.curMargin.left + instance.curMargin.right), quotePadding);

            context.fillStyle = "rgba(130, 130, 130, 0.25)";
            context.fillRect(instance.curX, instance.curY - lineHeight, Math.round(canvas.width * 0.015), quotePadding);*/

            //instance.lastY = instance.curY;
            //instance.curY += quotePadding;

            notifyLineHeight(instance, quotePadding);

            return;
        }

        if(instruction.type == "blockquote_close") {
            

            const quotePadding = Math.round(lineHeight * 0.75);

            /*
            const quotePadding = Math.round(lineHeight * 0.75);

            context.fillStyle = "rgba(130, 130, 130, 0.15)";
            context.fillRect(instance.curX, instance.lastY, canvas.width - (instance.curMargin.left + instance.curMargin.right), quotePadding);

            context.fillStyle = "rgba(130, 130, 130, 0.25)";
            context.fillRect(instance.curX, instance.lastY, Math.round(canvas.width * 0.015), quotePadding);*/

            /*
            instance.lastY = instance.curY;
            instance.curY += quotePadding;
            instance.curX = instance.margin;*/

            notifyLineHeight(instance, quotePadding);

            conductNewLine(instance);

            instance.inBlockquote = false;

            return;
        }

        if(instruction.type == "image") {

            let src = null;
            let alt = null;

            if(instruction.attrs && instruction.attrs.length > 0) {

                for(let j = 0; j < instruction.attrs.length; j++) {
                    const attr = instruction.attrs[j];

                    if(attr[0] == "src") {
                        src = attr[1];
                    }

                    if(attr[0] == "alt") {
                        alt = attr[1];
                    }
                }

                if(src) {
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
                            const imgWidth = Math.floor(imgOb.width * instance.scale);
                            const imgHeight = Math.floor(imgOb.height * instance.scale);

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

            notifyLineHeight(instance, lineHeight);

            if(instance.inBlockquote && instance.curX == instance.curMargin.left) {

                /*
                context.fillStyle = "rgba(130, 130, 130, 0.15)";
                context.fillRect(instance.curX, instance.curY - lineHeight, canvas.width - (instance.curMargin.left + instance.curMargin.right), lineHeight);

                context.fillStyle = "rgba(130, 130, 130, 0.25)";
                context.fillRect(instance.curX, instance.curY - lineHeight, Math.round(canvas.width * 0.015), lineHeight);
                */


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
            instance.context.globalCompositeOperation = "destination-over";

            instance.context.fillStyle = "rgba(130, 130, 130, 0.15)";
            instance.context.fillRect(instance.curMargin.left, instance.lastY, instance.canvas.width - (instance.curMargin.left + instance.curMargin.right), instance.lastLineHeight);

            instance.context.fillStyle = "rgba(130, 130, 130, 0.25)";
            instance.context.fillRect(instance.curMargin.left, instance.lastY, Math.round(instance.canvas.width * 0.015), instance.lastLineHeight);
        }
    }
    
    instance.lastY = instance.curY;
    instance.curY += instance.lastLineHeight;
    instance.curX = instance.curMargin.left;
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