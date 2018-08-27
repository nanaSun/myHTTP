function copeData(str,boundary){
    let lines = str.split(boundary).slice(1,-1);//去除收尾
    lines.forEach(line=>{
        let [head,tail] = line.split("\r\n\r\n");
        head = head.toString();
        if(head.includes('filename')){ // 这是文件
          console.log('-----------------');
          console.log(line.slice(head.length + 4, -2));
         // fs.writeFileSync(Math.random() + '', line.slice(head.length + 4, -2));
        }else{
          // 文本
          let name = head.match(/name="(\w*)"/)[1];
          console.log(tail.toString().slice(0,-2));
        }
      });
}
function bodyparser(){
    return async (ctx,next)=>{
        let buf = [];
        let string="";
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
                    string=Buffer.concat(buf).toString()
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