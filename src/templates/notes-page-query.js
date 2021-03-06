import { graphql } from 'gatsby';
import NotesPage from '../components/notes-page';

export default NotesPage;

export const query = graphql`
  query($formatString: String!) {
    allNotePage(sort: { fields: date, order: DESC }) {
      nodes {
        isDraft
        slug
        title
        date(formatString: $formatString)
        timeToRead
        description
        tags {
          name
          slug
        }
      }
    }
  }
`;
