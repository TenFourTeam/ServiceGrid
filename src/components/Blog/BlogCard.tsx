import { Link } from "react-router-dom";
import { Calendar, Clock } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { BlogPost } from "@/landing/blogData";

interface BlogCardProps {
  post: BlogPost;
}

export function BlogCard({ post }: BlogCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric", 
      year: "numeric" 
    });
  };

  return (
    <Link to={`/blog/${post.slug}`}>
      <Card className="h-full hover:scale-[1.02] transition-transform duration-300 hover:shadow-lg">
        <CardHeader className="space-y-3">
          <Badge variant="secondary" className="w-fit">
            {post.category}
          </Badge>
          <h3 className="text-xl font-semibold leading-tight line-clamp-2 hover:text-primary transition-colors">
            {post.title}
          </h3>
        </CardHeader>
        
        <CardContent>
          <p className="text-muted-foreground line-clamp-3">
            {post.excerpt}
          </p>
        </CardContent>

        <CardFooter className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {post.author.name.split(" ").map(n => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{post.author.name}</span>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(post.publishDate)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {post.readTime}
                </span>
              </div>
            </div>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
