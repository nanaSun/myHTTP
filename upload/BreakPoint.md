# 如何手写一款KOA中间件实现断点续传

这几天在认认真真地学习KOA框架，了解它的原理以及KOA中间件的实现方法。在研究KOA如何处理上传的表单数据的时候，我灵光一闪，这是不是可以用于断点续传？

断点续传并不是服务器端一端的自high，他还需要前端的配合，而且我只准备扒拉一个大致的雏形，所以这个功能我准备：
* 后端：手写KOA中间件处理断点数据
* 前端：原生JS

断点续传的过程不复杂，但是还是有许多小知识点需要get，不然很难理解断点续传的工作过程。实现断点续传的方式有很多，不过我只研究了ajax的方式，所以预备的小知识点如下：

## KOA部分：

### **Headers的`content-type`**

```
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryE1FeIoZcbW92IXSd
```

HTML的form组件一共提供三种方式的编码方法：`application/x-www-form-urlencoded`(默认)、`multipart/form-data`、`text/plain`。前两种方式比较常见，最后一种不太用，也不推荐使用。前两种的区别就是默认的方法是无法上传`<input type="file"/>`的。所以如果我们需要上传文件，那么就一定要用`multipart/form-data`。

### **form上传的`raw data`**

在KOA中，server获取到的data都是`raw data`也就是未经处理的二进制数据。我们需要格式化这些数据，提取有效内容。我们来分析一下如何处理这些`raw data`。

当我们上传的时候，我们会发现一个现象，就是`content-type`还跟了一个小尾巴`multipart/form-data; boundary=----WebKitFormBoundarygNnYG0jyz7vh9bjm`，这个长串的字符串是用来干嘛的呢？看一眼完整的`raw data`  :

```
------WebKitFormBoundarygNnYG0jyz7vh9bjm
Content-Disposition: form-data; name="size"

668
------WebKitFormBoundarygNnYG0jyz7vh9bjm
Content-Disposition: form-data; name="file"; filename="checked.png"
Content-Type: image/png


------WebKitFormBoundarygNnYG0jyz7vh9bjm--
```

大家发现没每个字段之间都有`------WebKitFormBoundarygNnYG0jyz7vh9bjm`将他们分割开来。所以这里的`boundary`是用来分割字段的。

关于`boundary`
* 它的值是可以自定义的，不过浏览器会帮我们定义
* 不能超过70个字符
* 在`raw data`中，需要在前方加上`--`，也就是这样`--boundary`，如果是结尾的分隔符那么在末尾也加一个`--`，就是这样`--boundary--`

更多详情，请参考[The Multipart Content-Type](https://www.w3.org/Protocols/rfc1341/7_2_Multipart.html)

### **http中`request`的`data`和`end`监听事件**

传数据给server，他也要有办法接受对不？所以这个时候，我们需要配置`data`监听数据的接受，以及`end`监听数据的接受完毕。

每次`data`事件触发，获取的数据都是一个Buffer类型的数据，然后将获取到的数据加到`buf`数组中，等结束的时候，再用`Buffer.concat`串联这些Buffer数据，变成一个完整的Buffer。就是这样，服务器将客户端的数据接受完毕了。

这一段就很简单了，`ctx.req`是KOA中封装的`request`。
```
let buf = [];
let allData;
ctx.req.on("data",(data)=>{
    buf.push(data)
});
ctx.req.on("end",(data)=>{
    allData=Buffer.concat(buf)
})
```

### **Buffer的处理**

*重点部分来了，这一部分了坑得我好惨。*

我们server获取到的`raw data`不是字符串，而是一串`Buffer`。Buffer是什么呢？是二进制数据。虽然我们可以将`Buffer`转为字符串再进行处理，但是遇到编码问题就会很头疼，因为`toString`默认是`utf-8`得编码格式。如果遇上不是`utf-8`的，那么我们得到的结果就很有问题。所以说如果想要加工`Buffer`数据就还是要用`Buffer`数据。比如`------WebKitFormBoundarygNnYG0jyz7vh9bjm`这一段我想知道再Buffer中这个一段的位置。那么我么可以把这一段变成Buffer，然后去逐个查询。

来一段我和raw data的血泪沟通史（P一下哈哈）：
|raw data|我|
|:--:|:--:|
|我是一段二进制流|我要处理你|
||我要把你变成我最爱的string，人类可读的语言，然后再分割你|
|如果我本来是人类可读，那么你可以这么做，万一我是图片或者其他格式，emmm|会有什么问题吗|
|那么你就看不到我原来的样子了|？？？|
|简而言之，如果我是图片，你把我转成文字，写入文件的话，我就是一堆乱码|what？？？(*Φ皿Φ*)|
|所以你只能用我的同类来处理我|同类？|
|也就是二进制流|也就是说我要把分隔符变成二进制流，然后来分割你？|
|就是这样~|大哥我输了|
|虽说我是二进制流，不过你可以用一个熟悉的方法来查询我|咦？有捷径吗？|
|[`buf.indexOf(value)`](http://nodejs.cn/api/buffer.html#buffer_buf_indexof_value_byteoffset_encoding)可以帮助你查询位置|哦|
|[buf.slice([start[, end]])](http://nodejs.cn/api/buffer.html#buffer_buf_slice_start_end)可以帮助你无损分割我|哦|
|我只能帮你到这儿了|走好，不送|


***实现代码：***

```
function splitBuffer(buffer,sep) {
    let arr = [];
    let pos = 0;//当前位置
    let sepPosIndex = -1;//分隔符的位置
    let sepPoslen = Buffer.from(sep).length;//分隔符的长度，以便确定下一个开始的位置
    do{
        sepPosIndex=buffer.indexOf(sep,pos)   
        if(sepPosIndex==-1){
            //当sepPosIndex是-1的时候，代表已经到末尾了，那么直接直接一口读完最后的buffer
            arr.push(buffer.slice(pos));
        }else{
            arr.push(buffer.slice(pos,sepPosIndex));
        }
      pos = sepPosIndex+sepPoslen
    }while(-1!==sepPosIndex)
    return arr
}
```

## 前端部分：
### ***H5中fileAPi的`slice`方法***

`slice`之前是用于数组的一个方法，现在文件也可以用`slice`来分割拉，不过需要注意的是这个方法是一个新的api，也就是很多old的浏览器无法使用。

用法很简单：

```
//初始位置，长度
//这里的File对象是一个Blob，一个类似于二进制的流，所以这里是以字节为单位的。
File.slice(startByte, length);
```



### ***JS的原生AJAX实现方式`XMLHttpRequest`***
### ***封装表单数据`FormData`***