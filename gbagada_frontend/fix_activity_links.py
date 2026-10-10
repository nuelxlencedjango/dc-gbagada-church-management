path = "src/pages/Landing.js"

old = """                      {!activity.is_virtual && activity.location && (
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                          {activity.location}
                        </Typography>
                      )}
                      {activity.description && (
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                          {activity.description}
                        </Typography>
                      )}
                      {activity.is_virtual && activity.link && (
                        <Button
                          variant="outlined"
                          size="small"
                          href={activity.link}
                          target="_blank"
                          sx={{ mt: 2 }}
                        >
                          Join Online
                        </Button>
                      )}"""

new = """                      {!activity.is_virtual && activity.location && (
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                          {activity.location}
                        </Typography>
                      )}
                      {activity.description && (
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                          {activity.description}
                        </Typography>
                      )}
                      {activity.link && (
                        <Button
                          variant="outlined"
                          size="small"
                          href={activity.link}
                          target="_blank"
                          sx={{ mt: 2 }}
                        >
                          {activity.is_virtual ? 'Join Online' : 'Get Directions'}
                        </Button>
                      )}"""

with open(path) as f:
    content = f.read()

if old not in content:
    print("Could not find the expected block — file may already be changed. Nothing done.")
elif content.count(old) > 1:
    print("Found the block more than once — refusing to guess. Nothing done.")
else:
    content = content.replace(old, new)
    with open(path, "w") as f:
        f.write(content)
    print("Done — Landing.js updated.")
