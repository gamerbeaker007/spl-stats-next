"use client";

import HiveMarkdownPreview from "@/components/hive-blog/HiveMarkdownPreview";
import { useHiveBlog } from "@/hooks/hive-blog/useHiveBlog";
import { useAuth } from "@/lib/frontend/context/AuthContext";
import { REQUIRED_TAGS } from "@/types/hive-blog";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import OutlinedInput from "@mui/material/OutlinedInput";
import Paper from "@mui/material/Paper";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { type KeyboardEvent, useEffect, useState } from "react";
import { MdContentCopy, MdSend } from "react-icons/md";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <Tooltip title={copied ? "Copied!" : `Copy ${label}`}>
      <IconButton size="small" onClick={handleCopy}>
        <MdContentCopy size={16} />
      </IconButton>
    </Tooltip>
  );
}

interface PostPanelProps {
  title: string;
  body: string;
  allTags: string[];
  onPost: (editedBody: string) => void;
  posting: boolean;
  posted: boolean;
  postError: string | null;
  loggedIn: boolean;
  loggedInAs: string;
}

function PostPanel({
  title,
  body,
  allTags,
  onPost,
  posting,
  posted,
  postError,
  loggedIn,
  loggedInAs,
}: PostPanelProps) {
  const [editedBody, setEditedBody] = useState(body);

  // Sync when body prop changes externally (e.g. after market scan completes)
  useEffect(() => {
    setEditedBody(body);
  }, [body]);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "50% 50%" },
        gap: 0,
        width: "100%",
      }}
    >
      {/* LEFT: editable markdown */}
      <Box sx={{ pr: { md: 2 }, borderRight: { md: "1px solid", borderColor: "divider" } }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Markdown
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            (editable — changes reflect in preview)
          </Typography>
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <Typography variant="body2" fontWeight={500}>
            Title
          </Typography>
          <CopyButton text={title} label="title" />
        </Box>
        <TextField
          fullWidth
          size="small"
          value={title}
          slotProps={{ input: { readOnly: true } }}
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <Typography variant="body2" fontWeight={500}>
            Body
          </Typography>
          <CopyButton text={editedBody} label="body" />
          <Box sx={{ ml: "auto" }}>
            <CopyButton text={`${title}\n\n${editedBody}`} label="all" />
            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
              Copy all
            </Typography>
          </Box>
        </Box>
        <TextField
          fullWidth
          multiline
          minRows={20}
          value={editedBody}
          onChange={(e) => setEditedBody(e.target.value)}
          slotProps={{ input: { sx: { fontFamily: "monospace", fontSize: 12 } } }}
        />
      </Box>

      {/* RIGHT: preview + post */}
      <Box sx={{ pl: { md: 2 } }}>
        {loggedIn ? (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Post to Hive
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Posts as <strong>@{loggedInAs}</strong> to the Splinterlands community with 10%
              beneficiary to @beaker007. Your Keychain extension will prompt for confirmation.
            </Typography>
            {posted && (
              <Alert severity="success" sx={{ mb: 1.5 }}>
                Post published successfully!
              </Alert>
            )}
            {postError && (
              <Alert severity="error" sx={{ mb: 1.5 }}>
                {postError}
              </Alert>
            )}
            <Button
              variant="contained"
              color="primary"
              startIcon={
                posting ? <CircularProgress size={16} color="inherit" /> : <MdSend size={16} />
              }
              onClick={() => onPost(editedBody)}
              disabled={posting || posted}
            >
              {posting ? "Posting…" : posted ? "Posted!" : "Post to Hive"}
            </Button>
          </Paper>
        ) : (
          <Alert severity="info">Log in to post directly to Hive.</Alert>
        )}

        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Preview
        </Typography>

        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
          <Divider sx={{ mb: 1.5 }} />
          <HiveMarkdownPreview markdown={editedBody} />
          <Divider sx={{ mt: 2, mb: 1.5 }} />
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {allTags.map((t) => (
              <Chip key={t} label={`#${t}`} size="small" />
            ))}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}

export default function HiveBlogContent() {
  const { user } = useAuth();
  const {
    accounts,
    accountsLoading,
    result,
    generating,
    generateError,
    posting,
    postError,
    postSuccess,
    postedIndices,
    generate,
    post,
  } = useHiveBlog();

  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [postMode, setPostMode] = useState<"combined" | "separate">("combined");
  const [extraTagInput, setExtraTagInput] = useState("");
  const [extraTags, setExtraTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState(0);

  const allTags = [...REQUIRED_TAGS, ...extraTags];

  const handleAddTag = () => {
    const tag = extraTagInput.trim().toLowerCase().replace(/^#/, "");
    if (tag && !allTags.includes(tag)) {
      setExtraTags((prev) => [...prev, tag]);
    }
    setExtraTagInput("");
  };

  const handleTagKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleGenerate = () => {
    setActiveTab(0);
    generate(selectedAccounts, postMode);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Hive Blog Generator
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Generate and publish a season report to the Splinterlands Hive community. Posts include 10%
        beneficiary rewards to @beaker007.
      </Typography>

      {/* Account + mode + generate controls */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start">
            <FormControl size="small" sx={{ minWidth: 260 }}>
              <InputLabel>Accounts</InputLabel>
              <Select
                multiple
                value={selectedAccounts}
                onChange={(e) =>
                  setSelectedAccounts(
                    typeof e.target.value === "string" ? [e.target.value] : e.target.value
                  )
                }
                input={<OutlinedInput label="Accounts" />}
                renderValue={(selected) => selected.join(", ")}
                disabled={accountsLoading}
              >
                {accounts.map((a) => (
                  <MenuItem key={a} value={a}>
                    <Checkbox checked={selectedAccounts.includes(a)} size="small" />
                    <ListItemText primary={a} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="contained"
              onClick={handleGenerate}
              disabled={selectedAccounts.length === 0 || generating}
              startIcon={generating ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {generating ? "Generating…" : "Generate"}
            </Button>
          </Stack>

          {selectedAccounts.length > 1 && (
            <Box>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                Post mode (multiple accounts selected)
              </Typography>
              <RadioGroup
                row
                value={postMode}
                onChange={(e) => setPostMode(e.target.value as "combined" | "separate")}
              >
                <FormControlLabel
                  value="combined"
                  control={<Radio size="small" />}
                  label="Combined post"
                />
                <FormControlLabel
                  value="separate"
                  control={<Radio size="small" />}
                  label="Separate posts"
                />
              </RadioGroup>
            </Box>
          )}
        </Stack>

        {generateError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {generateError}
          </Alert>
        )}

        {result?.missingAccounts.length ? (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Missing season data for: <strong>{result.missingAccounts.join(", ")}</strong>. Run a
            worker sync for these accounts first.
          </Alert>
        ) : null}

        {result?.unclaimedRewardAccounts.length ? (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Cannot find season rewards (Glint) for season {result.previousSeasonId} for:{" "}
            <strong>{result.unclaimedRewardAccounts.join(", ")}</strong>. This may mean the season
            rewards have not been claimed in Splinterlands yet, or the background sync has not
            picked them up yet.
          </Alert>
        ) : null}
      </Paper>

      {/* Tag editor */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Tags
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 1.5 }}>
          {REQUIRED_TAGS.map((t) => (
            <Chip key={t} label={`#${t}`} size="small" color="primary" variant="outlined" />
          ))}
          {extraTags.map((t) => (
            <Chip
              key={t}
              label={`#${t}`}
              size="small"
              onDelete={() => setExtraTags((prev) => prev.filter((x) => x !== t))}
            />
          ))}
        </Box>
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            placeholder="Add optional tag"
            value={extraTagInput}
            onChange={(e) => setExtraTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            sx={{ width: 200 }}
          />
          <Button size="small" variant="outlined" onClick={handleAddTag}>
            Add
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
          Press Enter or Space to add. Required tags are always included.
        </Typography>
      </Paper>

      {/* Result panels */}
      {result && result.mode === "combined" && (
        <PostPanel
          title={result.title}
          body={result.body}
          allTags={allTags}
          loggedIn={!!user}
          loggedInAs={user?.username ?? ""}
          onPost={(editedBody) => post(user!.username, allTags, undefined, editedBody)}
          posting={posting}
          posted={postSuccess}
          postError={postError}
        />
      )}

      {result && result.mode === "separate" && (
        <Box>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{ mb: 2 }}
            variant="scrollable"
            scrollButtons="auto"
          >
            {result.posts.map((p, i) => (
              <Tab
                key={p.username}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    @{p.username}
                    {postedIndices.includes(i) && (
                      <Chip label="Posted" size="small" color="success" sx={{ ml: 0.5 }} />
                    )}
                  </Box>
                }
              />
            ))}
          </Tabs>

          {result.posts.map((p, i) =>
            activeTab === i ? (
              <PostPanel
                key={p.username}
                title={p.title}
                body={p.body}
                allTags={allTags}
                loggedIn={!!user}
                loggedInAs={user?.username ?? ""}
                onPost={(editedBody) => post(user!.username, allTags, i, editedBody)}
                posting={posting}
                posted={postedIndices.includes(i)}
                postError={postError}
              />
            ) : null
          )}
        </Box>
      )}
    </Box>
  );
}
