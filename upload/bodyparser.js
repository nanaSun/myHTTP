const fs=require("fs")
Buffer.prototype.split = function (sep) {
    let arr = [];
    let pos = 0;
    let index = 0;
    let len = Buffer.from(sep).length;
    console.log(Buffer.from(sep))
    while (-1!==(index=this.indexOf(sep,pos))) {
      arr.push(this.slice(pos,index));
      pos = index+len;
    }
    arr.push(this.slice(pos));
    return arr
  }
  
function copeData(buffer,boundary){
    let lines = buffer.split(boundary).slice(1,-1);//去除收尾
    let obj={};
    lines.forEach(line=>{
        let [head,tail] = line.split("\r\n\r\n");
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
          obj[name]=parseInt(value)
        }
    });
    if(obj.start===0){
        console.log("write")
        fs.writeFileSync(`./myhttp/upload/uploads/${obj.filename}`,obj.file);
    }else{
        fs.appendFileSync(`./myhttp/upload/uploads/${obj.filename}`,obj.file);
    }
    if(obj.end===obj.size){
        console.log(obj);
    }

}
function bodyparser(){
    return async (ctx,next)=>{
        let buf = [];
        let string;
        let boundary ="";
        try {
            boundary=ctx.headers["content-type"].split("=")[1]
            boundary = '--'+boundary
            console.log(boundary)
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
module.exports=bodyparser