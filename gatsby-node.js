const kebabCase = require('lodash.kebabcase');

const mdxResolverPassthrough = (fieldName) => async (
  source,
  args,
  context,
  info
) => {
  const type = info.schema.getType(`Mdx`);
  const mdxNode = context.nodeModel.getNodeById({
    id: source.parent,
  });
  const resolver = type.getFields()[fieldName].resolve;
  const result = await resolver(mdxNode, args, context, {
    fieldName,
  });
  return result;
};

// Create general interfaces that you could can use to leverage other data sources
// The core theme sets up MDX as a type for the general interface
exports.createSchemaCustomization = ({ actions }) => {
  const { createTypes, createFieldExtension } = actions;

  const slugify = (source) => {
    const slug = source.slug ? source.slug : kebabCase(source.title);

    return `/${slug}`.replace(/\/\/+/g, `/`);
  };

  createFieldExtension({
    name: `slugify`,
    extend() {
      return {
        resolve: slugify,
      };
    },
  });

  createFieldExtension({
    name: `mdxpassthrough`,
    args: {
      fieldName: `String!`,
    },
    extend({ fieldName }) {
      return {
        resolve: mdxResolverPassthrough(fieldName),
      };
    },
  });

  createTypes(`
    type StoryPageTag {
      name: String
      slug: String
    }

    interface StoryPage @nodeInterface {
      id: ID!
      slug: String! @slugify
      title: String!
      releaseDate: Date! @dateformat
      excerpt(pruneLength: Int = 160): String!
      body: String!
      timeToRead: Int
      tags: [StoryPageTag]
      banner: File @fileByRelativePath
      description: String
    }

    type MdxStoryPage implements Node & StoryPage {
      slug: String! @slugify
      title: String!
      releaseDate: Date! @dateformat
      excerpt(pruneLength: Int = 140): String! @mdxpassthrough(fieldName: "excerpt")
      body: String! @mdxpassthrough(fieldName: "body")
      timeToRead: Int @mdxpassthrough(fieldName: "timeToRead")
      tags: [StoryPageTag]
      banner: File @fileByRelativePath
      description: String
    }

    type MinimalBlogConfig implements Node {
      storiesPath: String!
      externalLinks: [ExternalLink!]!
      navigation: [NavigationEntry!]!
    }
    type ExternalLink {
      name: String!
      url: String!
    }
    type NavigationEntry {
      title: String!
      slug: String!
    }
  `);
};

exports.sourceNodes = ({ actions, createContentDigest }) => {
  const { createNode } = actions;

  const minimalBlogConfig = {
    storiesPath: '/stories',
    externalLinks: [],
    navigation: [],
  };

  createNode({
    ...minimalBlogConfig,
    id: `site >>> config`,
    parent: null,
    children: [],
    internal: {
      type: `MinimalBlogConfig`,
      contentDigest: createContentDigest(minimalBlogConfig),
      content: JSON.stringify(minimalBlogConfig),
    },
  });
};

exports.onCreateNode = ({
  node,
  actions,
  getNode,
  createNodeId,
  createContentDigest,
}) => {
  const { createNode, createParentChildLink } = actions;

  // Make sure that it's an MDX node
  if (node.internal.type !== `Mdx`) {
    return;
  }

  // Create a source field
  // And grab the sourceInstanceName to differentiate the different sources
  // In this case "postsPath" and "pagesPath"
  const fileNode = getNode(node.parent);
  const source = fileNode.sourceInstanceName;

  // Check for "pages" and create the "Page" type
  if (source === 'stories') {
    const fieldData = {
      slug: node.frontmatter.slug ? node.frontmatter.slug : undefined,
      title: node.frontmatter.title,
      releaseDate: node.frontmatter.releaseDate,
      // tags: modifiedTags,
      banner: node.frontmatter.banner,
      description: node.frontmatter.description,
    };

    const mdxStoryPageId = createNodeId(`${node.id} >>> MdxStoryPage`);

    createNode({
      ...fieldData,
      // Required fields
      id: mdxStoryPageId,
      parent: node.id,
      children: [],
      internal: {
        type: `MdxStoryPage`,
        contentDigest: createContentDigest(fieldData),
        content: JSON.stringify(fieldData),
        description: `Mdx implementation of the StoryPage interface`,
      },
    });

    createParentChildLink({ parent: node, child: getNode(mdxStoryPageId) });
  }
};

// These template are only data-fetching wrappers that import components
// const homepageTemplate = require.resolve(`./src/templates/homepage-query.tsx`);
const storiesPageTemplate = require.resolve(
  `./src/templates/stories-page-query.js`
);
const storyPageTemplate = require.resolve(
  `./src/templates/story-page-query.js`
);

exports.createPages = async ({ actions, graphql, reporter }) => {
  const { createPage } = actions;

  // createPage({
  //   path: "/",
  //   component: homepageTemplate,
  //   context: {
  //     formatString: defaultOptions.formatString,
  //   },
  // });

  createPage({
    path: `/stories`,
    component: storiesPageTemplate,
    context: {
      breadcrumbs: ['stories'],
      formatString: `DD.MM.YYYY`,
    },
  });

  const result = await graphql(`
    query {
      allStoryPage(sort: { fields: releaseDate, order: DESC }) {
        nodes {
          slug
        }
      }
    }
  `);

  if (result.errors) {
    reporter.panicOnBuild(
      `There was an error loading your pages`,
      result.errors
    );
    return;
  }

  result.data.allStoryPage.nodes.forEach((page) => {
    const breadcrumbs = page.slug.split('/').filter(Boolean);
    createPage({
      path: page.slug.replace(/\/\/+/g, `/`),
      component: storyPageTemplate,
      context: {
        breadcrumbs,
        slug: page.slug,
        formatString: `DD.MM.YYYY`,
      },
    });
  });
};