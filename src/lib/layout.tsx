import type { FC } from "hono/jsx";

export type LayoutProps = {
  title: string;
  description?: string;
  keywords?: string;
  author?: string;
  children?: any;
  styles?: string;
  scripts?: string;
  meta?: Array<{ name?: string; property?: string; content: string }>;
  links?: Array<{ rel: string; href: string; crossOrigin?: string }>;
};

export const Layout: FC<LayoutProps> = (props) => {
  const {
    title,
    description = "API Documentation for api.oluwasetemi.dev",
    keywords = "API, Documentation, api.oluwasetemi.dev",
    author = "Oluwasetemi Ojo",
    children,
    styles,
    scripts,
    meta = [],
    links = [],
  } = props;

  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords} />
        <meta name="author" content={author} />

        {/* Default Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700&display=swap" rel="stylesheet" />

        {/* Additional meta tags */}
        {meta.map((metaTag, index) => (
          <meta
            key={index}
            {...(metaTag.name ? { name: metaTag.name } : {})}
            {...(metaTag.property ? { property: metaTag.property } : {})}
            content={metaTag.content}
          />
        ))}

        {/* Additional links */}
        {links.map((link, index) => (
          <link
            key={index}
            rel={link.rel}
            href={link.href}
            {...(link.crossOrigin ? { crossOrigin: link.crossOrigin } : {})}
          />
        ))}

        {/* Custom styles */}
        {styles && <style dangerouslySetInnerHTML={{ __html: styles }} />}

        {/* Custom scripts */}
        {scripts && <script dangerouslySetInnerHTML={{ __html: scripts }} />}
      </head>
      <body>
        {children}
      </body>
    </html>
  );
};
