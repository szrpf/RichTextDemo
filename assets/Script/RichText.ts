/*******************************************************************************
 * 创建: 2022年6月17日
 * 作者: 刘飞(27185709@qq.com)
 * 描述: 富文本，支持动态修改格式、插入图集帧、插入预制体（可播动画）
 * 1、支持转译字符
 * \n或回车-->换行
 * \t或Tab-->插入2个空格
 * \b-->字体加粗，例如：
 *      “江\b苏\0省”——“苏”字加粗
 * \c-->换色，例如：
 *      “四\cf00\c川\0省”——“省”变#f00
 * \d-->添加删除线，例如：
 *      “\d陕西\0省”——“陕西”会有删除线
 * \u-->添加下划线，例如：
 *      “安\u徽省\0”——“徽省”会有下划线
 * （注意：删除线和下划线只能2选1）
 * \f-->设置字体，例如：
 *      “浙\fKaiTi\f江\0省”——“江”变楷体（常见字体:Arial、KaiTi、SimSun等）
 * \0-->恢复默认值，搭配\b、\c、\d、\u、\f使用
 * \i-->插入图片（仅限Atlas图集帧），例如：
 *      “海南\iGame/Hero\i省”——“海南”后面插入图集帧“Resource/Atlas/Game/Hero”
 * \p-->插入预制体，例如：
 *      “新疆\pBoss\p省”——“新疆”后面插入预制体“Resource/Boss”，设置PlayOnLoad可播动画
 * 2、添加ScrollView，可以实现RichText滚动
 *    可以修改ScrollView的滚动模式，实现移屏、翻页
 *    可以通过ScrollView的自动排版，实现水平、垂直滚动
*******************************************************************************/
const FONT_MAX_LENGTH = 10;
const COLOR_MAX_LENGTH = 6;
const IMAGE_MAX_LENGTH = 20;
const PREFAB_MAX_LENGTH = 16;
const { ccclass, property, executeInEditMode, menu } = cc._decorator;
@ccclass
@executeInEditMode
@menu('Comp/RichText')
export default class RichText extends cc.Component {
    @property
    private _string: string = '';
    @property({ displayName: CC_DEV && '文本内容', multiline: true, tooltip: CC_DEV && '转译字符表：\n\\n 或 回车--->换行\n\\t 或 Tab --->插入2个空格\n\\b--->字体加粗，例如：\n“江\\b苏\\0省”——“苏”字加粗\n\\c--->换色，例如：\n“四\\cf00\\c川\\0省”——“川”变#f00\n\\d--->添加删除线，例如：\n“\\d陕西\\0省”——“陕西”会有删除线\n\\u--->添加下划线，例如：\n“安\\u徽省\\0”——“徽省”会有下划线\n注意：删除线和下划线只能2选1\n\\f--->设置字体，例如：\n“浙\\fKaiTi\\f江\\0省”——“江”变楷体\n常见字体:Arial、KaiTi、SimSun\n\\0--->恢复初始值\n搭配\\b、\\c、\\d、\\u、\\f使用\n\\i--->插入Atlas图集帧，例如：\n“海南\\iGame/Hero\\i省”——“海南”后面插入图集帧\n“Resource/Atlas/Game/Hero”\n\\p--->添加预制体，例如：\n“新疆\\pBoss\\p省”——“新疆”后面插入预制体“Resource/Boss”，设置PlayOnLoad可播动画' })
    get string() { return this._string; }
    set string(value: string) {
        this._string = value;
        this.updateContent();
    }
    @property
    private _color: cc.Color = new cc.Color(255, 255, 255);
    @property({ displayName: CC_DEV && '文本颜色' })
    private get color() { return this._color };
    private set color(value: cc.Color) {
        this._color = value;
        this.updateContent();
    }
    @property
    private _strokeWidth: number = 0;
    @property({ min: 0, displayName: CC_DEV && '描边宽度' })
    private get strokeWidth() { return this._strokeWidth };
    private set strokeWidth(value: number) {
        this._strokeWidth = value;
        this.updateContent();
    }
    @property
    private _strokeColor: cc.Color = new cc.Color(0, 0, 0);
    @property({ displayName: CC_DEV && '描边颜色', visible() { return this.strokeWidth > 0 } })
    private get strokeColor() { return this._strokeColor };
    private set strokeColor(value: cc.Color) {
        this._strokeColor = value;
        this.updateContent();
    }
    @property
    private _fontName: string = 'Arial';
    @property({ displayName: CC_DEV && '字体名称' })
    private get fontName() { return this._fontName };
    private set fontName(value: string) {
        this._fontName = value;
        this.updateContent();
    }
    @property
    private _fontSize: number = 50;
    @property({ min: 4, displayName: CC_DEV && '字体大小' })
    private get fontSize() { return this._fontSize };
    private set fontSize(value: number) {
        this._fontSize = value;
        this.updateContent();
    }
    @property
    private _rowDis: number = 10;
    @property({ displayName: CC_DEV && '行间距' })
    private get rowDis() { return this._rowDis };
    private set rowDis(value: number) {
        this._rowDis = value;
        this.updateContent();
    }
    private cvs: HTMLCanvasElement = null;
    private ctx: CanvasRenderingContext2D = null;
    private cellX: number = 0;
    private cellY: number = 0;
    private rowW: number = 0;
    private rowH: number = 0;
    private font: string = '';
    private bold: string = '';
    private style: string = '0';
    private viewX: number = 0;
    private viewY: number = 0;
    private viewWidth: number = 0;
    private viewHeight: number = 0;
    private pageNode: cc.Node = null;

    protected start() {
        this.updateContent();
        this.node.on(cc.Node.EventType.SIZE_CHANGED, this.updateContent, this);
        this.node.on(cc.Node.EventType.ANCHOR_CHANGED, this.updateContent, this);
    }

    private updateContent() {
        if(cc.isValid(this.node)){
            this.node.removeAllChildren();
            this.node.destroyAllChildren();
        }
        this.cvs = null;
        this.ctx = null;
        let str = this.string;
        if (!str) return;
        this.viewX = -this.node.width*this.node.anchorX;
        this.viewY = this.node.height*(1-this.node.anchorY);
        this.viewWidth = this.node.width;
        this.rowH = this.fontSize + this.rowDis;
        this.viewHeight = this.node.height - this.node.height % this.rowH;
        this.cellX = 0;
        this.cellY = this.rowH;
        this.rowW = 0;
        this.bold = '';
        this.style = '0';
        this.font = this.fontName;
        let charW = 0;
        let startID = 0;
        this.createPage();
        for (let i = 0, len = str.length; i <= len; ++i) {
            if (i === len) {
                this.drawToPage(str.substring(startID, len));
                if (startID < len || this.pageNode.childrenCount > 0) {
                    this.pageToNode();
                } else {
                    this.pageNode.removeFromParent();
                    this.pageNode.destroy();
                }
                break;
            }
            switch (str[i]) {
                case '\\':
                    if (i === len - 1) {
                        continue;
                    }
                    this.drawToPage(str.substring(startID, i));
                    switch (str[i + 1]) {
                        case 'n':
                            startID = ++i + 1;
                            this.addRow();
                            this.rowW = 0;
                            this.cellX = 0;
                            continue;
                        case 't':
                            startID = ++i + 1;
                            charW = this.fontSize;
                            if (this.rowW + charW > this.viewWidth) {
                                this.rowW = charW;
                                this.cellX = this.rowW;
                                this.addRow();
                            } else {
                                this.rowW += charW;
                                this.cellX = this.rowW;
                            }
                            continue;
                        case 'b':
                            startID = ++i + 1;
                            this.cellX = this.rowW;
                            this.bold = 'bold';
                            this.ctx.font = `${this.bold} ${this.fontSize}px ${this.font}`;
                            continue;
                        case 'd':
                            startID = ++i + 1;
                            this.cellX = this.rowW;
                            this.style = 'd';
                            continue;
                        case 'u':
                            startID = ++i + 1;
                            this.cellX = this.rowW;
                            this.style = 'u';
                            continue;
                        case 'f': {
                            let id = str.substring(i + 2, i + 4 + FONT_MAX_LENGTH).indexOf('\\f', 0);
                            if (id === -1) break;
                            id += i + 2;
                            this.font = str.substring(i + 2, id);
                            this.ctx.font = `${this.bold} ${this.fontSize}px ${this.font}`;
                            i = id + 1;
                            startID = id + 2;
                            this.cellX = this.rowW;
                        } continue;
                        case 'c': {
                            let id = str.substring(i + 2, i + 4 + COLOR_MAX_LENGTH).indexOf('\\c', 0);
                            if (id === -1) break;
                            if (id !== 3 && id !== 6) break;
                            id += i + 2;
                            this.ctx.fillStyle = '#' + str.substring(i + 2, id);
                            i = id + 1;
                            startID = id + 2;
                            this.cellX = this.rowW;
                        } continue;
                        case '0':
                            startID = ++i + 1;
                            this.cellX = this.rowW;
                            this.style = '0';
                            this.font = this.fontName;
                            this.bold = '';
                            this.ctx.font = `${this.bold} ${this.fontSize}px ${this.font}`;
                            this.ctx.fillStyle = '#' + this.color.toHEX();
                            continue;
                        case 'i': {
                            let id = str.substring(i + 2, i + 4 + IMAGE_MAX_LENGTH).indexOf('\\i', 0);
                            if (id === -1) break;
                            id += i + 2;
                            let node = new cc.Node('image');
                            node.anchorX = 0;
                            node.anchorY = 0;
                            if (CC_EDITOR) {
                                node.width = this.rowH;
                                node.height = this.rowH;
                            } else {
                                let spt = node.addComponent(cc.Sprite);
                                spt.spriteFrame = gi.load(str.substring(i + 2, id));
                                node.scale = this.rowH / node.height;
                                if (node.width * node.scale > this.viewWidth) {
                                    node.scale = this.viewWidth / node.width;
                                }
                            }
                            let width = node.width * node.scale;
                            if (this.rowW + width > this.viewWidth) {
                                node.x = 0;
                                this.rowW = width;
                                this.addRow();
                            } else {
                                node.x = this.rowW;
                                this.rowW += width;
                            }
                            node.setParent(this.pageNode);
                            node.y = -this.cellY;
                            this.cellX = this.rowW;
                            i = id + 1;
                            startID = id + 2;
                        } continue;
                        case 'p': {
                            let id = str.substring(i + 2, i + 4 + PREFAB_MAX_LENGTH).indexOf('\\p', 0);
                            if (id === -1) break;
                            id += i + 2;
                            let node = null;
                            if (CC_EDITOR) {
                                node = new cc.Node('prefab');
                                node.width = this.rowH;
                                node.height = this.rowH;
                            } else {
                                node = cc.instantiate(gi.resource[str.substring(i + 2, id)]);
                                node.scale = this.rowH / node.height;
                                if (node.width * node.scale > this.viewWidth) {
                                    node.scale = this.viewWidth / node.width;
                                }
                            }
                            let width = node.width * node.scale;
                            let height = node.height * node.scale;
                            if (this.rowW + width > this.viewWidth) {
                                node.x = 0;
                                this.rowW = width;
                                this.addRow();
                            } else {
                                node.x = this.rowW;
                                this.rowW += width;
                            }
                            node.setParent(this.pageNode);
                            node.x += width*node.anchorX;
                            node.y = height*node.anchorY - this.cellY;
                            this.cellX = this.rowW;
                            i = id + 1;
                            startID = id + 2;
                        } continue;
                    }
                    break;
                case '\n':
                    this.drawToPage(str.substring(startID, i));
                    startID = i + 1;
                    this.addRow();
                    this.rowW = 0;
                    this.cellX = 0;
                    continue;
                case '\t':
                    this.drawToPage(str.substring(startID, i));
                    startID = i + 1;
                    charW = this.fontSize;
                    if (this.rowW + charW > this.viewWidth) {
                        this.rowW = charW;
                        this.cellX = this.rowW;
                        this.addRow();
                    } else {
                        this.rowW += charW;
                        this.cellX = this.rowW;
                    }
                    continue;
            }
            charW = this.ctx.measureText(str[i]).width;
            if (this.rowW + charW > this.viewWidth) {
                this.drawToPage(str.substring(startID, i));
                startID = i;
                this.cellX = 0;
                this.rowW = charW;
                this.addRow();
            } else {
                this.rowW += charW;
            }
        }
        let scrollView = this.node.getComponent('ScrollView');
        scrollView && scrollView.updateLayout();
    }

    private createPage() {
        this.pageNode = new cc.Node(`page${this.node.childrenCount}`);
        this.pageNode['_objFlags'] |= cc.Object['Flags'].HideInHierarchy;
        this.pageNode['_objFlags'] |= cc.Object['Flags'].LockedInEditor;
        let font = this.ctx ? this.ctx.font : `${this.bold} ${this.fontSize}px ${this.font}`;
        let fillStyle = this.ctx ? this.ctx.fillStyle : '#' + this.color.toHEX();
        this.cvs = document.createElement('canvas');
        this.ctx = this.cvs.getContext('2d');
        this.cvs.width = this.viewWidth;
        this.cvs.height = this.viewHeight;
        this.ctx.font = font;
        this.ctx.fillStyle = fillStyle;
        this.ctx.lineWidth = this.strokeWidth;
        this.ctx.strokeStyle = '#' + this.strokeColor.toHEX();
    }

    private drawToPage(str: string) {
        if (str === '') return;
        let x = this.cellX;
        let y = this.cellY - this.fontSize * 0.15 - this.rowDis * 0.5;
        let strokeWidth = this.ctx.lineWidth;
        if (this.strokeWidth) {
            this.ctx.strokeText(str, x, y);
        }
        this.ctx.fillText(str, x, y);
        //显示外框，调试用
        // this.ctx.strokeRect(x, this.cellY - this.rowH, this.ctx.measureText(str).width, this.rowH);
        switch (this.style) {
            case 'd':
                this.ctx.lineWidth = Math.max(this.fontSize >> 3, this.strokeWidth);
                this.ctx.beginPath();
                this.ctx.moveTo(x, y - this.fontSize / 2 + this.ctx.lineWidth);
                this.ctx.lineTo(x + this.ctx.measureText(str).width, y - this.fontSize / 2 + this.ctx.lineWidth);
                this.ctx.stroke();
                this.ctx.lineWidth = strokeWidth;
                break;
            case 'u':
                this.ctx.lineWidth = Math.max(this.fontSize >> 3, this.strokeWidth);
                this.ctx.beginPath();
                this.ctx.moveTo(x, y + this.ctx.lineWidth);
                this.ctx.lineTo(x + this.ctx.measureText(str).width, y + this.ctx.lineWidth);
                this.ctx.stroke();
                this.ctx.lineWidth = strokeWidth;
                break;
        }
    }

    private pageToNode() {
        let texture = new cc.Texture2D();
        texture.initWithElement(this.cvs);
        this.pageNode.addComponent(cc.Sprite).spriteFrame = new cc.SpriteFrame(texture, cc.rect(0, 0, this.cvs.width, this.cvs.height));
        this.pageNode.width = this.viewWidth;
        this.pageNode.height = this.viewHeight;
        this.pageNode.anchorX = 0;
        this.pageNode.anchorY = 1;
        this.pageNode.x = this.viewX;
        this.pageNode.y = this.viewY - this.viewHeight * this.node.childrenCount;
        this.pageNode.setParent(this.node);
    }

    private addRow() {
        if (this.cellY + this.rowH > this.viewHeight) {
            this.pageToNode();
            this.createPage();
            this.cellY = this.rowH;
        } else {
            this.cellY += this.rowH;
        }
    }

    protected onDestroy() {
        this.node.removeAllChildren();
        this.node.destroyAllChildren();
        this.node.targetOff(this);
    }
}