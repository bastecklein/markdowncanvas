import markdownit from "markdown-it";

let mit = new markdownit();

export function markdownToCanvas(markdown, canvas, options) {

    const context = canvas.getContext("2d");

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
        context: canvas.getContext("2d"),
        canvas: canvas
    };

    order.curY = order.curSize * order.scale;

    context.clearRect(0, 0, canvas.width, canvas.height);

    const instructions = mit.parse(markdown, {});

    console.log(instructions);
    console.log(order);

    for(let i = 0; i < instructions.length; i++) {
        const inst = instructions[i];
        renderInstruction(order, inst);
    }
}

function renderInstruction(instance, instruction) {
    if(instruction.children && instruction.children.length > 0) {
        for(let i = 0; i < instruction.children.length; i++) {
            const child = instruction.children[i];
            renderInstruction(instance, child);
        }

        return;
    }

    const lineHeight = (instance.curSize + 2) * instance.scale;

    const canvas = instance.canvas;
    const context = instance.context;

    if(instruction.type) {
        if(instruction.type == "heading_open") {
            instance.curX = 0;

            
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

            instance.curY += lineHeight;

            return;
        }

        if(instruction.type == "heading_close") {
            instance.curY += lineHeight;
            instance.curX = 0;
            instance.curSize = instance.baseSize;
            instance.curWeight = "normal";
            return;
        }


        if(instruction.type == "paragraph_close") {
            instance.curY += lineHeight * 2;
            instance.curX = 0;
            return;
        }

        if(instruction.type == "hr") {

            context.lineWidth = instance.scale;

            context.beginPath();
            context.moveTo(0, instance.curY - (instance.scale * 12));
            context.lineTo(canvas.width, instance.curY - (instance.scale * 12));
            context.stroke();

            instance.curY += instance.scale * 12;
            instance.curX = 0;
            return;
        }

        if(instruction.type == "softbreak") {
            if(instance.useBreaks) {
                instance.curY += lineHeight;
                instance.curX = 0;
            }
            
            return;
        }

        if(instruction.type == "hardbreak") {
            instance.curY += lineHeight;
            instance.curX = 0;
            
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
    }

    let ital = "";

    if(instance.curItalic) {
        ital = "italic ";
    }

    context.font = ital + instance.curWeight + " " + (instance.curSize * instance.scale) + "px " + instance.curFace;

    if(instruction.content && instruction.content.trim().length > 0) {

        const words = instruction.content.split(" ");

        for(let i = 0; i < words.length; i++) {
            let word = words[i];

            if(i < words.length - 1) {
                word += " ";
            }

            const metrics = context.measureText(word);

            if(instance.curX + metrics.width > canvas.width) {
                instance.curX = 0;
                instance.curY += lineHeight;
            }

            

            context.fillText(word, instance.curX, instance.curY);

            instance.curX += metrics.width;
        }
    }
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