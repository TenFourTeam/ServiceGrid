import { useState } from "react";
import { BlogHero } from "@/components/Blog/BlogHero";
import { CategoryFilter } from "@/components/Blog/CategoryFilter";
import { BlogCard } from "@/components/Blog/BlogCard";
import { TopNav } from "@/landing/components/TopNav";
import { Footer } from "@/landing/components/Footer";
import { getBlogPosts, getBlogCategories } from "@/landing/blogData";

export default function Blog() {
  const [activeCategory, setActiveCategory] = useState("All");
  const allPosts = getBlogPosts();
  const categories = getBlogCategories();

  const filteredPosts =
    activeCategory === "All"
      ? allPosts
      : allPosts.filter((post) => post.category === activeCategory);

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <BlogHero />
      
      <div className="container pb-20">
        <div className="mb-12">
          <CategoryFilter
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No posts found in this category.</p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
