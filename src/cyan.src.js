// ==UserScript==
// @name         智慧职教 Icve 网课助手(青版)
// @version      0.2
// @description  小巧强大的智慧职教刷课脚本,中文化自定义各项参数
// @author        tuChanged
// @run-at       document-end
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @match        *www.icve.com.cn/study/directory*
// @license      MIT
// @namespace https://greasyfork.org/users/449085
// @supportURL https://github.com/W-ChihC/SimpleIcveMoocHelper
// @contributionURL https://greasyfork.org/users/449085
// ==/UserScript==
(async function () {
    'use strict';
    const setting = {
        /*影响刷课速度关键选项,延时非最优解,过慢请自行谨慎调整*/
        最高延迟响应时间: 5000,//毫秒
        最低延迟响应时间: 3000,//毫秒
        //自行根据课件情况修改
        固定PPT页数: 20,//页
        //0-流畅 1-清晰 2-原画 
        视频清晰度: 0,
        //2倍速,允许开倍速则有效,请放心使用
        视频播放倍速: 2,
        //是否保持静音
        是否保持静音: true,
        //请求超时时间
        请求超时时间: 2000,
        /*
        * 📣如果您有软件定制(管理系统,APP,小程序等),毕设困扰,又或者课程设计困扰等欢迎联系,
        *    价格从优,源码调试成功再付款💰,
        *     实力保证,包远程,包讲解 QQ:2622321887
        */

    }, _self = unsafeWindow,
        url = location.pathname,
        top = _self
    /** 等待获取jquery @油猴超星网课助手 wyn665817*/
    try {
        while (top != _self.top) top = top.parent.document ? top.parent : _self.top;
    } catch (err) {
        console.log(err);
        top = _self;
    }
    var $ = _self.jQuery || top.jQuery;
    /** */

    //产生区间随机数
    const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

    //课程ID
    const courseID = getQueryValue("courseId")
    //章节ID
    const chapterID = getQueryValue("chapterId")
    //小节ID
    let cellID = getQueryValue("#")
    //小节类型
    const type = getQueryValue("type")
    let db = undefined
    await initDB()

    if (!chapterID) {
        //非小节,解析目录
        dirParser()
    } else {
        console.log(`当前课件为${type}`);
        switch (type) {
            case "video":
                delayExec(() => mediaHandler())
                break;
            case "text":
            case "doc":
                delayExec(() => docHandler())
                break
            default:
                delayExec(() => currentCompleted())
                break;
        }
    }
    /**
     * 当前课程结束调用
     * @param {*} params 
     */
    function currentCompleted() {
        db.transaction(['course'], 'readwrite').objectStore('course')
            .delete(cellID).onsuccess = function (params) {
                console.log(`课程${cellID}已完成`);
                delayExec(() => nextLesson())
            }
    }

    function nextLesson() {
        db.transaction(['course'], 'readwrite').objectStore('course')
            .openCursor()
            .onsuccess = (event) => {
                console.log(event, `课程已准备`);
                const result = event.target.result;
                if (result) {
                    let { ChapterId, CellType, Id } = result.value || {};
                    gotoURL(`dir_course.html?courseId=${courseID}&chapterId=${ChapterId}&type=${CellType}#${Id}`)
                } else {
                  console.log("数据库读取失败,请规范操作,从课程目录进入\n清除浏览器IndexDB数据库后再次尝试");
                }

            }
    }
    /**
     * 跳转
     * @param {*} url 
     */
    function gotoURL(url) {
        console.log(url);

        top.location = url
    }
    //hash值监听
    unsafeWindow.addEventListener("hashchange", () => cellID = getQueryValue("#"));

    /**
        * 获取url查询字段
        * @param {查询字段} query
        */
    function getQueryValue(query) {
        let url = window.location.search; //获取url中"?"符后的字串
        //返回hash
        if (query == "#")
            return location.hash.slice(1);
        //返回Query
        let theRequest = new Object();
        if (url.indexOf("?") != -1) {
            let str = url.substr(1);
            let strs = str.split("&");
            for (let i = 0; i < strs.length; i++)
                theRequest[strs[i].split("=")[0]] = unescape(strs[i].split("=")[1]);
        }
        return theRequest[query];
    }
    //解析目录
    function dirParser() {
        request("GET", `https://www.icve.com.cn/study/Directory/directoryList?courseId=${courseID}`,
            {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                },
                onSuccess: (xhr) => {
                    const json = JSON.parse(xhr.responseText).directory;
                    // console.log(dbRequest);
                    //将课程目录解析
                    parseLessons(json)
                    // parseLessons(JSON.parse(temp1.responseText).directory || {})
                }
            }
        )
    }
    //解析并处理储存课程列表
    function parseLessons(json) {
        //status 0(未看)  status 1已看
        //将读取到课程的放到localStorge,并记录状态 进行 未进行 未完成 完成

        // 0->section->cells->0->status
        //             chapter
        //将未完成的课程信息提取
        if (db != undefined) {
            const tx = db.transaction(['course'], 'readwrite');
            tx.oncomplete = (e) => {
                console.log('课程批量插入成功', e)
                nextLesson()
            };
            tx.onerror = (e) => console.log('批量插入失败', e);

            const store = tx
                .objectStore('course');

            json.forEach(e => {
                e.chapters.forEach(i => {
                    i.cells.forEach(x => {
                        if (x.Status == 0)
                            store.put(x)
                    })
                })
            })
        }
        else console.log("数据库启动失败,程序终止");

    }
    /**
     * 初始化indexDB
     * @param {} version 
     */
    function initDB(version = 1) {

        return new Promise((resolve, reject) => {

            const dbRequest = indexedDB.open('ICVE', version)
            dbRequest.addEventListener('upgradeneeded', e => {
                const objectStore = e.target.result
                    .createObjectStore('course', { keyPath: 'Id', autoIncrement: false });
                // //多字段查询
                // objectStore.createIndex('SectionIdIndex', 'SectionId', { unique: false });
                // objectStore.createIndex('ChapterIdIndex', 'ChapterId', { unique: false });
            });
            dbRequest.onsuccess = function (e) {
                db = e.target.result;
                console.log("数据库连接成功!");
                resolve()
            }
        })
    }

    /**
     * 对XHR的二次全局封装,方便后期扩展
     * @param {*} method 
     * @param {*} url 
     * @param {*} headers 
     * @param {*} data 
     * @param {*} onSuccess 
     */
    function request(method, url, { headers, data, onSuccess }) {
        GM_xmlhttpRequest({
            method: method,
            url: url,
            headers: headers,
            data: data,
            timeout: setting.请求超时,
            onload: function (xhr) {
                switch (xhr.status) {
                    case 200:
                        // var obj = $.parseJSON(xhr.responseText) || {};
                        onSuccess(xhr)
                        break;
                    default:
                        console.log("服务器异常 " + xhr);
                        break;
                }
            },
            ontimeout: function () {
                console.log("响应超时");
            }
        });
    }
    /**
        * 使用异步实现
        *
        *  随机延迟执行方法
        * @param {需委托执行的函数} func
        */

    function delayExec(func) {
        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    await func()
                } catch (error) {
                    console.log(func, error);
                }
                resolve();
            }, rnd(setting.最低延迟响应时间, setting.最高延迟响应时间));
        })
    }
    /**
    * 视频/音频类处理
    */
    function mediaHandler() {
        let player = jwplayer($(".jwplayer").attr("id"))

        //视频暂停状态
        if (player.getState() == "PAUSED") {
            console.log("媒体已暂停,恢复播放");
            player.play()
        }

        //播放回调
        if (player.getState() == "COMPLETE") {
            console.log("媒体已播放完毕\n");
            delayExec(currentCompleted());
            return;
        }
        //配置
        player.setMute(setting.是否保持静音)//静音
        player.setCurrentQuality(setting.视频清晰度)
        try {
            player.setPlaybackRate(setting.视频播放倍速)
        } catch (error) {
            console.log('倍速开启失败');
        }

        //播放回调
        player.onPlaylistComplete(function () {
            console.log("媒体播放完成\n");
            delayExec(currentCompleted());
        })
    }

    /**
   * 文档处理
   * @param {*} current
   */
    async function docHandler() {

        //根据按钮状态判断是否还有下一页
        while ($(".MPreview-pageNext").hasClass('current')) {
            console.log("文档翻页了");

            //ppt翻页 异步方式
            await delayExec(() => {
                $(".MPreview-pageNext").click()
            })
        }
        delayExec(currentCompleted());
    }
})();
