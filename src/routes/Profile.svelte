<script lang="typescript">
    import { onMount } from 'svelte';
    import { AuthService } from "../services/auth.service";

    const authService = AuthService.getInstance();

    onMount(async () => {
        authService.validateTokenAndNavigate().then(res => {
        });
    });

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

