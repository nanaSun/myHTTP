let myhttp=require("./application")
let Router=require("./router")
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

let admin=new Router()
admin.get("/",(ctx,next)=>{
    ctx.body="admin"
    next()
})
.get("/login",(ctx,next)=>{
    ctx.body="admin/login"
    next()
})
.get("/register",(ctx,next)=>{
    ctx.body="admin/register"
    next()
})

let user=new Router()
user.get("/",(ctx,next)=>{
    ctx.body="user"
    next()
})
.get("/login",(ctx,next)=>{
    ctx.body="user/login"
    next()
})
.get("/register",(ctx,next)=>{
    ctx.body="user/register"
    next()
})

let router=new Router()
router.use("/admin",admin.routers())
.use("/user",user.routers())


app.use(router.routers())

app.listen(3000)