function encode(s) {
    var i, r = [], c, x;
    for (i = 0; i < s.length; i++)
        if ((c = s.charCodeAt(i)) < 0x80) r.push(c);
        else if (c < 0x800) r.push(0xC0 + (c >> 6 & 0x1F), 0x80 + (c & 0x3F));
        else {
            if ((x = c ^ 0xD800) >> 10 == 0)
                c = (x << 10) + (s.charCodeAt(++i) ^ 0xDC00) + 0x10000,
                    r.push(0xF0 + (c >> 18 & 0x7), 0x80 + (c >> 12 & 0x3F));
            else r.push(0xE0 + (c >> 12 & 0xF));
            r.push(0x80 + (c >> 6 & 0x3F), 0x80 + (c & 0x3F));
        };
    return r;
}

function token(s) {
    var data = new Uint8Array(encode(s))
    var i, j, t;
    var l = ((data.length + 8) >>> 6 << 4) + 16, s = new Uint8Array(l << 2);
    s.set(new Uint8Array(data.buffer)), s = new Uint32Array(s.buffer);
    for (t = new DataView(s.buffer), i = 0; i < l; i++)s[i] = t.getUint32(i << 2);
    s[data.length >> 2] |= 0x80 << (24 - (data.length & 3) * 8);
    s[l - 1] = data.length << 3;
    var w = [], f = [
        function () { return m[1] & m[2] | ~m[1] & m[3]; },
        function () { return m[1] ^ m[2] ^ m[3]; },
        function () { return m[1] & m[2] | m[1] & m[3] | m[2] & m[3]; },
        function () { return m[1] ^ m[2] ^ m[3]; }
    ], rol = function (n, c) { return n << c | n >>> (32 - c); },
        k = [1518500249, 1859775393, -1894007588, -899497514],
        m = [1732584193, -271733879, null, null, -1009589776];
    m[2] = ~m[0], m[3] = ~m[1];
    for (i = 0; i < s.length; i += 16) {
        var o = m.slice(0);
        for (j = 0; j < 80; j++)
            w[j] = j < 16 ? s[i + j] : rol(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1),
                t = rol(m[0], 5) + f[j / 20 | 0]() + m[4] + w[j] + k[j / 20 | 0] | 0,
                m[1] = rol(m[1], 30), m.pop(), m.unshift(t);
        for (j = 0; j < 5; j++)m[j] = m[j] + o[j] | 0;
    };
    t = new DataView(new Uint32Array(m).buffer);
    for (var i = 0; i < 5; i++)m[i] = t.getUint32(i << 2);

    var hex = Array.prototype.map.call(new Uint8Array(new Uint32Array(m).buffer), function (e) {
        return (e < 16 ? "0" : "") + e.toString(16);
    }).join("");
    return hex;
}


let a5Cookie = ""
requestAPI('GET', 'http://chadaan8.com/api/cookie.php').then((xhr) => {
    a5Cookie = xhr.responseText
})

async function quickSearch(q, i) {
    reRender = true

    q = q.trim().substr(0, 100)


    commonShow(q, requestAPI('POST', "http://chadaan8.com/api/client.php", {
        data: `q=${encodeURIComponent(q)}&cookie=${a5Cookie}`,
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset:UTF-8" }
    }), i)


    // commonShow(q, requestAPI('GET', `http://ct.shuakela.top/wkapi.php?tm=${encodeURIComponent(q)}`), i)
    commonShow(q, requestAPI('GET', `http://qs.nnarea.cn/chaoxing_war/topicServlet?action=query&q=${encodeURIComponent(q)}`), i)

}

async function slowSearch(q, i) {
    q = q.trim().substr(0, 100)

    commonShow(q, requestAPI('GET', `http://www.mt3e.cn/api1.php?question=${encodeURIComponent(q)}`), i)

    commonShow(q, requestAPI('GET', `http://www.mt3e.cn/api3.php?question=${encodeURIComponent(q)}`), i)

    commonShow(q, requestAPI('GET', `http://www.mt3e.cn/api2.php?question=${encodeURIComponent(q)}`), i)
}

async function commonShow(a, api, i) {
    try {
        let a3 = await api
        showAnswerListDiv(a, await answerParse(a3), i)
    } catch (error) {
        console.log(error);
    }
}

/**
 * 接口转换解析
 * @param {*} e 
 */
async function answerParse(e) {
    const _list = []
    if (!e.responseText)
        return
    const submitBody = {
        _id: '',
        q: '',
        a: [],
        o: [],
        t: -1,
        s: ""
    }
    try {
        const url = e.finalUrl;
        console.log(e.responseText);
        const json = JSON.parse(e.responseText)

        if (url.match(/.*qs\.nnarea\.cn/)) {
            if (json.code == '1') {
                submitBody._id = token(new Date().getTime()) + "" + rnd(100, 100000)
                submitBody.q = json.question
                submitBody.a.push(json.data)
                _list.push(submitBody)
            }
        } else if (url.match(/.*www\.mt3e\.cn/)) {
            if (json.answer.indexOf("抱歉找不到结果，") == -1 && json.answer != "暂无答案") {
                submitBody._id = token(new Date().getTime()) + "" + rnd(100, 100000)
                submitBody.q = json.question
                submitBody.a.push(json.answer)
                _list.push(submitBody)
            }
        } else if (url.match(/.*chadaan8\.com/)) {
            if (json.success == 200) {
                if (json.data[0].answer.indexOf("抱歉找不到结果，") === -1)
                    json.data && json.data.forEach(e => {
                        submitBody._id = token(new Date().getTime()) + "" + rnd(100, 100000)
                        submitBody.q = e.question
                        const a1 = e.answer.split("chadaan8.com免费查答案，支持图片：");
                        const a2 = e.answer.split("加群274247618帮助推广，领10元红包：")
                        if (a1.length >= 2) {
                            submitBody.a.push(a1[1])
                        }
                        else if (a2.length >= 2) {
                            submitBody.a.push(a2[1])
                        }
                        else {
                            submitBody.a.push(e.answer)
                        }
                        _list.push(submitBody)
                    });
            }

        } else if (url.match(/.*ct\.shuakela\.top/)) {
            submitBody._id = token(new Date().getTime()) + "" + rnd(100, 100000)
            submitBody.q = json.tm
            submitBody.a.push(json.answer)
            _list.push(submitBody)
        }
        if (_list.length != 0) {
            await requestAPI("PUT", "http://39.96.64.75/s", {
                headers: { "Content-Type": "application/json;charset=utf-8" },
                data: JSON.stringify(_list)
            })
            await requestAPI("GET", "http://39.96.64.75/").catch(() => {
                alert("服务器被D到自闭🤯 ,无法继续查题，请在两小时后重试")
                throw Error
            })
        }
        console.log(_list);
        return _list.map(e => {
            return {
                'question': e.q,
                'answer': e.a,
                'options': e.o,
            }
        })
    } catch (e) {
        console.log(e);
        return []
    }
}