// ==UserScript==
// @name         智慧职教网课助手 蓝版
// @version      1.08
// @description  智慧职教简易自动刷课脚本
// @author        tuChanged
// @run-at       document-end
// @grant        unsafeWindow
// @match       *://mooc.icve.com.cn/study/*
// ==/UserScript==
(function () {
    'use strict';
    const setting = {
        // 随机评论
        randomComment: ["6666", "好", "讲解得很精辟"],
        //是否启用评论,
        isOpenComment: false,
        //最高延迟
        maxDelayTime: 5000,
        //最低3秒
        minDelayTime: 3000,
        //0-高清 1-清晰 2-流畅 3-原画
        videoQuality: 2,
        //2倍速
        videoPlaybackRate: 2
    }, _self = unsafeWindow,
        url = location.pathname,
        top = _self

    try {
        while (top != _self.top) top = top.parent.document ? top.parent : _self.top;
    } catch (err) {
        console.log(err);
        top = _self;
    }
    var $ = _self.jQuery || top.jQuery;

    //产生区间随机
    var rnd = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
    /**
     * 随机延迟执行方法
     * @param {需委托执行的函数} func 函数
     */
    var delayExec = (func) => setTimeout(func, rnd(setting.minDelayTime, setting.maxDelayTime));
    //跳转到某小节 通过顶栏
    var gotoUrl = (page) => page.contents()[3].click();
    //跳转下一页
    // var nextCourse = () => $(".next").click();


    //入口
    switch (url) {
        case "/study/courseLearn/resourcesStudy.html":
            _main();
            break;
        case "/study/discussionArea/topicReply.html":
            discussHandler();
            break;
        case "/study/workExam/testWork/preview.html":
        case "/study/workExam/onlineExam/preview.html":
            homeworkHandler();
            break;
        case "/study/workExam/homeWork/history.html":
        case "/study/workExam/onlineExam/history.html":
        case "/study/workExam/testWork/history.html":
            floatHandler();
            break;
        default:
            console.log(`脚本已准备启动 当前位置:${url}`);
            break;
    }

    //当前页
    let current;

    //刷课主逻辑
    function _main() {
        //请求数据
        $("#olTempleteCellModul").click();
        //main函数
        setTimeout(() => {
            //当前小节
            current = $("li.np-section-level.np-section-level-3.active");
            switch (current.data().categoryname) {
                case "pt":
                case "文档":
                    pptHandler(current);
                    break;
                case "视频":
                    videoHandler(current);
                    break;
            }
            console.log("当前处理逻辑安排完成,等待执行结果中");
        }, 10000);
    }

    /**
     * 检测课程类别 并深层递归
     */
    function check(current) {
        //多级跳转
        if (current.next().length == 0) {
            // current.end();
            //往树根遍历
            //小章节
            let parent = current.closest(".np-section-level-2");
            if (parent.next().length == 0) {
                //大章
                let ancestor = parent.closest(".np-section-level-1")
                //检测是否到终章
                if (ancestor.next().length == 0) {
                    alert("任务完成");
                    //关闭当前窗口
                    // closeTab();
                } else {
                    check(ancestor.next().find(".np-section-level-3").first());
                }
            } else {
                check(parent.next().find(".np-section-level-3").first())
            }
            return;
        }
        //查询下一个是否已完成
        if (current.next().find("span.np-section-type.active").length > 0) {
            check(current.next());
            return;
        }
        //查询下一项所属类别
        switch (current.next().data().categoryname) {
            case ""://目录
            case "作业":
            case "测验":
                check(current.next());
                break;
            case "讨论":
                setTimeout(() => {
                    gotoUrl(current.next())
                }, 20000);
                check(current.next());
                break;
            case "pt":
            case "视频":
            case "文档":
                gotoUrl(current.next());
                _main();
                break;
        }
    }
    /**
     * 作业处理
     */
    function homeworkHandler() {
        uncageCopyLimit()
    }
    /*
     *  解除文本限制   
     */
    function uncageCopyLimit() {
        let arr = ["oncontextmenu", "ondragstart", "onselectstart", "onselect", "oncopy", "onbeforecopy"]
        for (let i of arr)
            $(".hasNoLeft").attr(i, "return true")
        console.log("已成功解除限制")
    }
    /**
     * 视频类处理
     */
    function videoHandler(current) {
        let player = top.jwplayer($(".jwplayer").attr("id"));
        //播放回调
        if (player.getState() == "complete") {
            console.log("视频原已播放完毕\n");
            delayExec(commentHandler(current));
            return;
        }
        //配置
        player.setMute(true)//静音
        player.setPlaybackRate(setting.videoPlaybackRate);
        player.setCurrentQuality(setting.videoQuality);
        //播放回调
        player.on("playlistComplete", () => {
            console.log("视频播放完成\n");
            delayExec(commentHandler(current));
        });
    }
    /**
     * PPT类别处理
     */
    function pptHandler(current) {
        //等待2秒后执行,避免不正常操作加载时间
        //延迟提交评论
        delayExec(commentHandler(current));
    }
    /**
     * 提取当前页内容
     */
    function exactProblem() {
        const arr = $(".e-q-body");
        let text = "";

        for (let x = 0; x < arr.length; x++)
            text += arr[x].innerText;
        $("#_content").val(text);

    }
    /**
     * 提取题目
     */
    function floatHandler() {
        const div = `<div style="border:#42b983 solid 2px;width: 330px; position: fixed; top: 0; right: 10px;  z-index: 99999">
                        <button id="extract_btn">提取</button>
                        <hr/>
                        <textarea id="_content" style="width: 100%;height: 300px;border: #B3C0D1 solid 2px;overflow: auto;font-size: x-small" />
                    </div>`;
        $(div).appendTo('body')
        $("#extract_btn").bind('click', () => exactProblem())
    }



    /**
    * 提交评论
    */
    function commentHandler(current) {

        if (setting.isOpenComment) {
            //评5星
            $("#star #starImg4").click();
            //随机从词库填写评论
            $("iframe#ueditor_0").contents().find("body.view")[0].innerText = setting.randomComment[rnd(0, setting.randomComment.length - 1)];
            //提交
            delayExec(() => {
                $("#btnComment").click();
                delayExec(() => {
                    $(".sgBtn.ok").click();
                    console.log("评论成功\n");
                    check(current);
                });
            });
        } else {
            check(current);
        }

    }
    /**
    * 提交讨论
    */
    function discussHandler() {
        setTimeout(() => {
            //获取上一位的评论  隔两个索引为评论  字数太少往下查找,避免太水
            let vaildComment = findVaildDiscuss();
            // //开启HTML输入模式
            // $EDITORUI["edui945"]._onClick();
            //填充评论
            $("iframe#ueditor_0").contents().find("body.view")[0].innerText = vaildComment;
            //提交
            delayExec(() => {
                $(".btn_replyTopic").click();
                console.log("讨论成功\n");
            }
            );
        }, 10000);
        /*  //返回上一页
         delayExec(() => window.history.go(-1)); */
    }

    /**
     * 简单地找出一个有效的讨论
     */
    function findVaildDiscuss() {
        let arr = $(".mc-learning-table  tbody tr div[id^='istext_']"), element;
        for (let i = 0; i < arr.length; i++) {
            element = arr[i].innerText;
            if (element.length > 10)
                return element;
        }
        return element;
    }
})();
