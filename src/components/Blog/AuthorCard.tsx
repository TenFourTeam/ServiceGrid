import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

interface AuthorCardProps {
  author: {
    name: string;
    role: string;
    avatar?: string;
  };
}

export function AuthorCard({ author }: AuthorCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg bg-primary/10 text-primary">
              {author.name.split(" ").map(n => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">About the Author</h3>
            <p className="font-medium">{author.name}</p>
            <p className="text-sm text-muted-foreground">{author.role}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
