const fs=require("fs")
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
  
function copeData(buffer,boundary){
    let lines = splitBuffer(buffer,boundary);
    console.log(buffer,lines)
    lines=lines.slice(1,-1);//去除收尾
    console.log(lines)
    let obj={};
    lines.forEach(line=>{
        let [head,tail] = splitBuffer(line,"\r\n\r\n");
        head = head.toString();
        if(head.includes('filename')){ // 这是文件
        //   console.log('-----------------');
        //   console.log(line.slice(head.length + 4, -2));
            obj["filename"]= head.match(/filename="(\S*)"/)[1];
            obj["file"]= line.slice(head.length + 4, -2)
            //fs.writeFileSync("./myhttp/upload/uploads/test.png",obj.file);
        }else{
          // 文本
          let name = head.match(/name="(\w*)"/)[1];
          let value= tail.toString().slice(0,-2);
          obj[name]=value
        }
    });
    if(obj.start===0){
        fs.writeFileSync(`./myhttp/upload/uploads/${obj.filename}`,obj.file);
    }else{
        fs.appendFileSync(`./myhttp/upload/uploads/${obj.filename}`,obj.file);
    }
    console.log(obj);
}
function bodyParser(){
    return async (ctx,next)=>{
        let buf = [];
        let string;
        let boundary ="";
        try {
            boundary=ctx.headers["content-type"].split("=")[1]
            boundary = '--'+boundary
            await new Promise((rs,rj)=>{
                ctx.req.on("data",(data)=>{
                    buf.push(data)
                });
                ctx.req.on("end",(data)=>{
                    string=Buffer.concat(buf)
                    copeData(string,boundary)
                    rs();
                })
            })
            await next();
        } catch (error) {
            await next();
        }
    }
}
module.exports=bodyParser