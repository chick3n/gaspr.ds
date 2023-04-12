import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

const HeaderNavBar = () => <AppBar className='header-navbar' sx={{bgcolor: '#081a2e', textAlign: 'left'}} position="static">
    <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            <Stack direction="row" gap={2}>
                <img src="./logo.png" height="38" />
                <a href="/">GASPR.d</a>
            </Stack>
        </Typography>
        <Button color="inherit">SICY</Button>
    </Toolbar>
</AppBar>

export default HeaderNavBar