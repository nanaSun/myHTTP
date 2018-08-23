let myhttp=require("./application")
let app= new myhttp()
function makeAPromise(ctx){
    return new Promise((rs,rj)=>{
        setTimeout(()=>{
            ctx.body="bbb"
            rs()
        },1000)
    })
}
//如果下方有需要执行的异步操作
app.use(async(ctx,next)=>{
    await next()//等待下方完成后再继续执行
    ctx.body="aaa"
})
app.use(async (ctx,next)=>{
    await makeAPromise(ctx).then(()=>{next()})
})
app.listen(3000)