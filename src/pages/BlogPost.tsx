import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { TopNav } from "@/landing/components/TopNav";
import { Footer } from "@/landing/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuthorCard } from "@/components/Blog/AuthorCard";
import { RelatedPosts } from "@/components/Blog/RelatedPosts";
import { getBlogPost, getRelatedPosts } from "@/landing/blogData";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getBlogPost(slug) : undefined;

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <div className="container py-20 text-center">
          <h1 className="text-4xl font-bold mb-4">Post Not Found</h1>
          <p className="text-muted-foreground mb-8">
            The blog post you're looking for doesn't exist.
          </p>
          <Link to="/blog">
            <Button>Back to Blog</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const relatedPosts = getRelatedPosts(post.slug, post.category);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      <article className="container py-8 md:py-12">
        <Link to="/blog">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Blog
          </Button>
        </Link>

        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="mb-12 space-y-4">
            <Badge variant="secondary" className="mb-4">
              {post.category}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDate(post.publishDate)}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {post.readTime}
              </span>
              <span>By {post.author.name}</span>
            </div>
          </header>

          {/* Content */}
          <div className="prose prose-lg max-w-none mb-12">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-3xl font-bold mt-8 mb-4">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-2xl font-bold mt-8 mb-4">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-xl font-semibold mt-6 mb-3">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="mb-4 leading-relaxed text-foreground">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="text-foreground">{children}</li>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-foreground">{children}</strong>
                ),
                code: ({ children }) => (
                  <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4">
                    {children}
                  </pre>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-primary pl-4 italic my-4">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>

          {/* Author */}
          <div className="mb-12">
            <AuthorCard author={post.author} />
          </div>

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <div className="border-t pt-12">
              <RelatedPosts posts={relatedPosts} />
            </div>
          )}
        </div>
      </article>

      <Footer />
    </div>
  );
}
