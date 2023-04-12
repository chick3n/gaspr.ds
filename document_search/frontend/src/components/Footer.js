
import Container from '@mui/material/Container';
import LinkIcon from '@mui/icons-material/Link';
import Typography from "@mui/material/Typography";
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';

const Footer = ({session}) => (
    <footer className="footer">
      <Container maxWidth="lg">
        <Grid container>
            <Grid item xs={6} md={6}>
            <p><img src='./gac-logo-en.svg' height="20" /></p>
            </Grid>
            <Grid item xs={6} md={6}>
                <p>
                    <Stack direction="row" gap={1} justifyContent="end" >
                        <Typography className="subtext" align='right' variant="caption" display="block" gutterBottom>Session: {session}</Typography>
                        <LinkIcon fontSize="small" />
                    </Stack>
                </p>
            </Grid>
        </Grid>
        
      </Container>
    </footer>
);

export default Footer