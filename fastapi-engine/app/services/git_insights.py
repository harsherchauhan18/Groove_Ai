import os
from git import Repo
from datetime import datetime, timedelta
from typing import List, Dict, Any

# Root directory where repositories are cloned
REPOS_BASE_DIR = os.getenv("REPOS_BASE_DIR", "../worker/data/repos")

class GitInsightsService:
    @staticmethod
    def get_repo(repo_id: str) -> Repo:
        repo_path = os.path.join(REPOS_BASE_DIR, repo_id)
        if not os.path.exists(repo_path):
            return None
        try:
            return Repo(repo_path)
        except Exception:
            return None

    @staticmethod
    def get_commits_per_author(repo_id: str) -> List[Dict[str, Any]]:
        repo = GitInsightsService.get_repo(repo_id)
        if not repo:
            return []
        
        authors = {}
        try:
            for commit in repo.iter_commits():
                author_name = commit.author.name
                authors[author_name] = authors.get(author_name, 0) + 1
        except Exception:
            return []
            
        return [{"name": name, "commits": count} for name, count in sorted(authors.items(), key=lambda x: x[1], reverse=True)]

    @staticmethod
    def get_commit_timeline(repo_id: str) -> List[Dict[str, Any]]:
        repo = GitInsightsService.get_repo(repo_id)
        if not repo:
            return []
        
        timeline = {}
        # Get only last 90 days
        limit_date = datetime.now() - timedelta(days=90)
        
        try:
            for commit in repo.iter_commits():
                dt = datetime.fromtimestamp(commit.committed_date)
                if dt < limit_date:
                    break
                date_str = dt.strftime("%Y-%m-%d")
                timeline[date_str] = timeline.get(date_str, 0) + 1
        except Exception:
            return []
            
        return [{"date": k, "commits": v} for k, v in sorted(timeline.items())]

    @staticmethod
    def get_file_owners(repo_id: str) -> List[Dict[str, Any]]:
        repo = GitInsightsService.get_repo(repo_id)
        if not repo:
            return []
            
        file_stats = {}
        try:
            # Look at last 300 commits for ownership detection
            for commit in repo.iter_commits(max_count=300):
                author = commit.author.name
                for file_path in commit.stats.files:
                    if file_path not in file_stats:
                        file_stats[file_path] = {}
                    file_stats[file_path][author] = file_stats[file_path].get(author, 0) + 1
        except Exception:
            return []
                
        output = []
        for path, authors in file_stats.items():
            top_owner = max(authors.items(), key=lambda x: x[1])
            output.append({
                "file_path": path,
                "owner": top_owner[0],
                "commits": top_owner[1]
            })
            
        return sorted(output, key=lambda x: x["commits"], reverse=True)

    @staticmethod
    def get_file_history(repo_id: str, file_path: str) -> List[Dict[str, Any]]:
        repo = GitInsightsService.get_repo(repo_id)
        if not repo:
            return []
            
        timeline = {}
        try:
            for commit in repo.iter_commits(paths=file_path, max_count=50):
                 date_str = datetime.fromtimestamp(commit.committed_date).strftime("%Y-%m-%d")
                 timeline[date_str] = timeline.get(date_str, 0) + 1
        except Exception:
            pass
            
        return [{"date": k, "commits": v} for k, v in sorted(timeline.items())]
