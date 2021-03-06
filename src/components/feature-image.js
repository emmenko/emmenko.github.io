import { Themed } from 'theme-ui';
import { Box, Link as HTMLLink } from '@theme-ui/components';
import { GatsbyImage } from 'gatsby-plugin-image';

const FeatureImage = (props) => {
  if (!props.image) {
    return null;
  }
  return (
    <Box sx={{ mb: [3, 4] }}>
      <GatsbyImage image={props.image.childImageSharp.gatsbyImageData} />
      <Box
        sx={{
          p: { m: 0, color: 'secondary', fontSize: 1, textAlign: 'center' },
        }}
      >
        <Themed.p>
          {'Photo by '}
          <HTMLLink href={props.authorUrl}>{props.author}</HTMLLink>
        </Themed.p>
      </Box>
    </Box>
  );
};

export default FeatureImage;
