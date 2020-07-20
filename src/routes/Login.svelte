<script lang="typescript">
    import { Link } from "svelte-routing";
    import { AuthService } from '../services/auth.service';
    
    let authService = AuthService.getInstance();
</script>

<style type="scss">
    .wrapper {
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    form {
        width: 350px;

        .action {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
    }
</style>

<div class="wrapper">
    <form>
        <div class="form-group">
            <label for="exampleInputEmail1">Email address</label>
            <input type="email" class="form-control" id="exampleInputEmail1" aria-describedby="emailHelp" placeholder="Enter email">
        </div>
        <div class="form-group">
            <label for="exampleInputPassword1">Password</label>
            <input type="password" class="form-control" id="exampleInputPassword1" placeholder="Password">
        </div>
        <div class="action">
            <Link class="already" to="/register">
                Not Registered Yet?
            </Link>
            <button type="submit" class="btn btn-primary">Login</button>
        </div>
    </form>
</div>