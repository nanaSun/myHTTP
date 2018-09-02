> 本文实现的断点续传只是我对断点续传的一个理解。其中有很多不完善的地方，仅仅是记录了一个我对断点续传一个实现过程。大家应该也会发现我用的都是一些H5的api，老得浏览器不会支持，以及我并未将跨域考虑入内，还有一些可能出现的一场等～巴啦啦。（怎么感觉这么多问题？？？笑～）

本文参考仓库：[点我](https://github.com/nanaSun/myHTTP/tree/master/upload)

这几天在认认真真地学习KOA框架，了解它的原理以及KOA中间件的实现方法。在研究KOA如何处理上传的表单数据的时候，我灵光一闪，这是不是可以用于断点续传？

断点续传并不是服务器端一端的自high，他还需要前端的配合，而且我只准备扒拉一个大致的雏形，所以这个功能我准备：
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

新建一个`XMLHttpRequest`
```
xhr = new XMLHttpRequest();
```

打开一个post为请求的链接
```
xhr.open("post", "/submit", true);
```

配置`onreadystatechange`，捕获请求链接的状态。
```
xhr.onreadystatechange = function(){
    //xhr.readyState
    //处理完成的逻辑
};
```
|readyState|意义|
|:--:|:--:|
|0|初始化|
|1|加载中|
|2|加载完成|
|3|部分可用|
|4|加载完成|

准备工作都做好了，最后send一下，请求链接。
```
xhr.send(表单数据);
```
下面一节会写如何生成send中的表单数据

### ***封装表单数据`FormData`***

`FormData`的使用很友好，就是按照健值一个个配对就可以了。
```
var formData = new FormData();
formData.append("test", "I am FormData");
formData.append("file", 你选择的文件);
```
虽然简单，但是却可以模拟post的数据格式send给服务器。

[详细用法,点我](https://developer.mozilla.org/zh-CN/docs/Web/API/FormData/Using_FormData_Objects)

## 断点续传

### 主要逻辑
写了这么多有关之后开发断点续传的相关知识点，我们可以动手开始写了。断点续传的逻辑并不复杂大概就是这样的：

|客户端client|服务器端server|
|:--:|:--:|
|我想上传一个文件|ok，no problem，不过你只能用post传给我|
|我的文件很大直接`form`提交可以吗|有多大，如果很大的话，一旦我们的连接断开，我们就前功尽弃了啊！慎重啊！|
|well，well，我把我的文件`slice`成一小块一小块慢慢给你行了吧|来吧baby～，我不介意你多来几次|
|第一部分`send`|接受中...|
|等待中...|接受完毕，处理接受的Blob，处理完毕已写入，你可以传第二部分了～|
|第二部分`send`|接受中...|
|等待中...|接受完毕，处理接受的Blob，处理完毕已写入，你可以传第三部分了～|
|...|...|
|...|终于结束了，我去处理下你的文件|
|...|ok~传送成功|

### 断点续传client端的处理方式

从上述逻辑来看，这个前端的流程可以分为：

* 确定文件大小，根剧相同的长度切片
* 根据切片的数量，进行回调上传

#### 切分文件

断点续传是客户端主动发送，服务器端被动接受的一个过程，所以这里是在客户端进行一个文件的切分，把文件根据`range`的大小进行切分，`range`的大小可以自定义。这里我为了防止每次上传切片都要计算位置，所以提前把所有的位置都放入了`currentSlice`的数组之中。然后按顺序取位置。注意：这边切分全部是以字节为单位的计算。

```
createSlices(){
    let s=0,e=-1,range=1024;
    for(let i = 0;i<Math.ceil(this.file.size/range);i++){
        s=i*range,e=e+range
        e=e>this.file.size-1?this.file.size-1:e;
        this.currentSlice.push([s,e])
    }
}
```

既然我们知道了切分的碎片有多少片，那么按照已上传的碎片除以总碎片就可以得到进度啦，就顺手算个进度吧。这边感觉好像很复杂的样子，淡定～我只是把界面样式都加进去了～

```
updateProcess(){
    let process=Math.round(this.currentIndex/this.currentSlice.length*100)
    this.fileProcess.innerHTML=`<span class="process"><span style='width:${process}%'></span><b>${process}%</b></span><span>${this.fileSize}</span>`
},
```

此外还需注意，文件的单位是字节，这个对于用户来说非常不友好，为了告诉用户文件有多大，我们需要转换一下。这里我是动态的转换，并不是固定一个单位，因为如果一个文件只有几KB，然后我却用G的单位来计算，那么就是满眼的0了。这里可以根据文件大的大小，具体情况具体分析。我这里只给了一个KB和MB的计算。可以自行elseif加条件。

```
calculateSize(){
    let fileSize=this.fileSize/1024;
    if(fileSize<512){
        this.fileSize=Math.round(fileSize)+"KB"
    } else {
        this.fileSize=Math.round(fileSize/1024)+"MB"
    }
},
```

#### 切分文件逐个上传

既然要上传了，那就不得不召唤`XMLHttpRequest`了。进行AJAX上传文件。上传文件必须要`enctype="multipart/form-data"`，因此还需要请出`FormData`帮我们创建form表单数据。

先创建一个表单数据吧～，其实我们只需要上传一个file的blob文件就可以了，但是服务器没有这么机智，能够自行给文件加独一无二的标识，所以我们在传文件的时候要加上文件的信息，比如文件名，文件大小，还有文件切分的位置。这个部分就是随意发挥了，看你需要啥就加入啥子段，比如时间啦，用户id啦，巴啦啦～

```
createFormData(){
    let formData = new FormData();
    let start=this.currentSlice[this.currentIndex][0]
    let end=this.currentSlice[this.currentIndex][1]
    let fileData=this.file.slice(start,end)
    formData.append("start", start);
    formData.append("end", end);
    formData.append("size", this.file.size);
    formData.append("fileOriName", this.file.name);
    formData.append("file", fileData);
    return formData;
}
```

终于准备活动做完了，该上传了。这边就是一个标准的`XMLHttpRequest`的上传模版，有么有很亲切很友好。这边不触及到跨域等那个啥的问题，所以很友好。大家只需在上传成功之后再回调此上传方法。逐个上传。直至最后一个切分。这里为了看出上传的过程，所以我加了一个500ms的延迟，这个仅仅是为了视觉效果，毕竟我只是试了几MB的文件，上传太快了。

```
createUpload(){
    let _=this
    let formData=this.createFormData()
    let xhr = new XMLHttpRequest();
    xhr.open("post", "/submit", true);
    xhr.onreadystatechange = function(){
        if (xhr.readyState == 4&&parseInt(xhr.status)==200){
            _.currentIndex++;
            if(_.currentIndex<=_.currentSlice.length-1){
                setTimeout(()=>{
                    _.createUpload()
                },500)
            }else{
                //完成后的处理
            }
            _.updateProcess()
        }
    };
    xhr.send(formData);
}
```

### 断点续传Server端的处理方式

从上述逻辑来看，这个后端的流程可以分为：

* 接受文件的数据流，加入Buffer
* 接受完毕，提取内容
* 重命名文件名
* 写入本地
* 重新从第一步开始获取文件，直至所有切片接受完毕。


#### 接收数据流

这估计是整个流程中最简单的部分了，node监听一下，组装一下，搞定！

```
let buf=[]
ctx.req.on("data",(data)=>{
    buf.push(data)
});
ctx.req.on("end",(data)=>{
    if(buf.length>0){
        string=Buffer.concat(buf)
    }
})
```

#### 提取内容

大家还记不记得我们传的是二进制，而且这个二进制除了文本字段，还有文件的二进制。这个时候，我们就需要先提取字段，再将文件和普通文本分开处理。

先拼装分隔符，这边是一个规定，就是`content-type`中的`boundary`前面需要加上`--`。

```
boundary=ctx.headers["content-type"].split("=")[1]
boundary = '--'+boundary
```

上文提到过二进制的分割只能用二进制，因此，我么可以把分隔符变成二进制，然后再分割接收到的内容。

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

分割完毕之后～就要开始处理啦！把字段都提取出来。这边我们把提取出的内容变成字符串，首先这个是为了判断字段类型，其次如果不是文件，那么可以提取出我们的字段文本，如果是文件类型的，那么就不能任性地`toString`了，我们需要把二进制的文件内容完美保存下来。

```
------WebKitFormBoundaryl8ZHdPtwG2eePQ2F
Content-Disposition: form-data; name="file"; filename="blob"
Content-Type: application/octet-streamk
换行*2
乱码
换行*1
------WebKitFormBoundaryl8ZHdPtwG2eePQ2F--
```

上传的内容大概长这样，空行的代码是`\r\n`，转化成二进制就是占2个位置，所以两个空行的截取就可以获取到字段信息和内容。因为末尾也有一个空行，所以在截取二进制文件内容的时候，除了头部的长度+2换行的长度，末尾的1换行长度也要加上，所以是`line.slice(head.length + 4, -2)`这个样子的。

```
function copeData(buffer,boundary){
    let lines = splitBuffer(buffer,boundary);
    lines=lines.slice(1,-1);//去除首尾
    let obj={};
    lines.forEach(line=>{
        let [head,tail] = splitBuffer(line,"\r\n\r\n");
        head = head.toString();
        if(head.includes('filename')){ // 这是文件
            obj["file"]= line.slice(head.length + 4, -2)
        }else{
          // 文本
          let name = head.match(/name="(\w*)"/)[1];
          let value= tail.toString().slice(0,-2);
          obj[name]=value
        }
    });
}
```

#### 重命名文件

我们上传的文件一般不存在原名保存，万一大家喜欢传重名的文件呢？头疼啊！这个时候就需要重命名，我一般喜欢用md5来计算新的文件名。这里可以拼接我们上传的一些字段
比如时间，主要是给一个特殊的标识，以保证当前上传的文件区别去其他文件。毕竟相同的内容用md5计算都是一样的，相同的文件名md5计算后并没有起到区分的作用。

当然文件的后缀不能忘记！不然文件保存下来了也打不开。所以记得提取一下文件后缀。

```
let fileOriName=crypto.createHash("md5").update(obj.fileOriName).digest("hex")
let fileSuffix=obj.fileOriName.substring(obj.fileOriName.lastIndexOf(".")+1)
```

#### 保存文件

此处我是按照是否是第一切片为主，看看是新建覆盖还是重新追加文件内容。大家注意下，因为如果文件不存在直接`appendFileSync`是会报错的。但是重复`writeFileSync`又会覆盖内容。所以需要区分一下，大家可以通过判断文件是否存在来进行区分～。

```
if(parseInt(obj.start)===0){
    fs.writeFileSync(__dirname+`/uploads/${fileOriName}.${fileSuffix}`,obj.file);
}else{
    fs.appendFileSync(__dirname+`/uploads/${fileOriName}.${fileSuffix}`,obj.file);
}
```

#### repeat repeat repeat

重复重复～直至客户端的切片全部传送完毕～

附录：

不理解KOA的可以看看我其他的文章：

本文的基础，[参考KOA，5步手写一款粗糙的web框架](https://juejin.im/post/5b7e8718e51d4538ca573445)

有关Router的实现思路，[这份Koa的简易Router手敲指南请收下](https://juejin.im/post/5b7fd1bc6fb9a019b421cc35)

有关模板实现思路，[KOA的简易模板引擎实现方式](https://juejin.im/post/5b865aeb6fb9a01a040717fb)