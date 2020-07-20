<script lang="typescript">
    let testTS: string = "Hello TypeScript";
    let testSCSS: string = "Hello SCSS";
</script>

<style type="text/scss">
    div{
        color: red;
        
        span{
            color: blue;
        }
    }
</style>

<div>
    {testTS}
    <span>{testSCSS}</span>
</div>

