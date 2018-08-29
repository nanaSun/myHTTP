let myhttp=require("./application")
let Router=require("./router")
let view=require("./Views")
let app=new myhttp()
let router=new Router()
//先处理获取数据的
router.get("/",view("/pages/template.ejs",{
    test:"index",
    users:[1,2,3]
}))
router.get("/admin",view("/pages/template.ejs",{
    test:"admin",
    users:[1,2,3]
}))
// app.use(view("/pages/template.ejs",{
//     test:"aaa",
//     users:[1,2,3]
// }))
app.use(router.routes())
app.listen(3000)