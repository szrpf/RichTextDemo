import RichText from "./RichText";

const {ccclass, property} = cc._decorator;

@ccclass
export default class SceneGame extends cc.Component {
    richText:RichText = null;
    start () {
        this.richText = cc.find('富文本',this.node).getComponent(RichText);
        // this.richText.string = '这是一个\\pBullet\\p富文本\\p爆炸\\p组件';
    }

}