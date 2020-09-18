import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import {
  Breadcrumb,
  Stack,
  CommandBar,
  ICommandBarItemProps,
  getTheme,
  IBreadcrumbItem,
  Text,
  IStackTokens,
  ITextStyles,
  Spinner,
} from '@fluentui/react';
import { useSelector, useDispatch } from 'react-redux';

import { State } from 'RootStateType';
import { useQuery } from '../hooks/useQuery';
import { selectPartById, getParts, deletePart } from '../store/partSlice';
import { thunkGetProject } from '../store/project/projectActions';
import { AddEditPartPanel, PanelMode } from '../components/AddPartPanel';
import LabelingPage, { LabelPageMode } from '../components/LabelingPage/LabelingPage';
import { EmptyAddIcon } from '../components/EmptyAddIcon';
import { CaptureDialog } from '../components/CaptureDialog';
import { postImages, getImages } from '../store/imageSlice';
import { ImageList } from '../components/ImageList';
import { selectImageItemByTaggedPart } from '../store/selectors';

const theme = getTheme();
const titleStyles: ITextStyles = { root: { fontWeight: 600, fontSize: '16px' } };
const infoBlockTokens: IStackTokens = { childrenGap: 10 };

export const PartDetails: React.FC = () => {
  const partId = parseInt(useQuery().get('partId'), 10);
  const part = useSelector((state: State) => selectPartById(state, partId));
  const dispatch = useDispatch();
  const history = useHistory();

  const [editPanelOpen, setEditPanelOpen] = useState(false);
  const openPanel = () => setEditPanelOpen(true);
  const closePanel = () => setEditPanelOpen(false);

  const labeledImages = useSelector(selectImageItemByTaggedPart(partId));

  const commandBarItems: ICommandBarItemProps[] = [
    {
      key: 'edit',
      text: 'Edit',
      iconProps: {
        iconName: 'Edit',
      },
      onClick: openPanel,
    },
    {
      key: 'delete',
      text: 'Delete',
      iconProps: {
        iconName: 'Delete',
      },
      onClick: () => {
        // Because onClick cannot accept the return type Promise<void>, use the IIFE to workaround
        (async () => {
          // eslint-disable-next-line no-restricted-globals
          if (!confirm('Sure you want to delete?')) return;

          await dispatch(deletePart(partId));
          history.push('/parts');
        })();
      },
    },
  ];

  useEffect(() => {
    dispatch(getParts());
    dispatch(thunkGetProject());
  }, [dispatch]);

  if (part === undefined) return <Spinner label="Loading" />;

  const breadCrumbItems: IBreadcrumbItem[] = [
    {
      key: 'parts',
      text: 'Objects',
      href: '/parts',
      onClick: (ev, item) => {
        ev.preventDefault();
        history.push(item.href);
      },
    },
    { key: part.name, text: part.name },
  ];

  const numImages = labeledImages.length;

  return (
    <>
      <Stack styles={{ root: { height: '100%' } }}>
        <CommandBar
          items={commandBarItems}
          styles={{ root: { borderBottom: `solid 1px ${theme.palette.neutralLight}` } }}
        />
        <Stack tokens={{ childrenGap: 30 }} styles={{ root: { padding: '15px' } }} grow>
          <Breadcrumb items={breadCrumbItems} />
          <Stack tokens={{ childrenGap: 20 }} horizontal grow>
            <PartInfo description={part.description} numImages={numImages} />
          </Stack>
        </Stack>
        <Images labeledImages={labeledImages}></Images>
        <AddEditPartPanel
          isOpen={editPanelOpen}
          onDissmiss={closePanel}
          mode={PanelMode.Update}
          initialValue={{
            name: { value: part.name, errMsg: '' },
            description: { value: part.description, errMsg: '' },
          }}
          partId={partId}
        />
      </Stack>
    </>
  );
};

const PartInfo: React.FC<{ description: string; numImages: number }> = ({ description, numImages }) => (
  <Stack tokens={{ childrenGap: 30 }} styles={{ root: { width: '100%', marginLeft: '0.8em' } }}>
    <Stack tokens={infoBlockTokens}>
      <Text styles={titleStyles}>Description</Text>
      <Text block nowrap>
        {description}
      </Text>
    </Stack>
    <Stack tokens={infoBlockTokens}>
      <Text styles={titleStyles}>Images</Text>
      <Text>
        <b>{numImages} images</b> have been trained for this object
      </Text>
    </Stack>
  </Stack>
);

export const Images: React.FC<{ labeledImages }> = ({ labeledImages }) => {
  const [isCaptureDialgOpen, setCaptureDialogOpen] = useState(false);
  const openCaptureDialog = () => setCaptureDialogOpen(true);
  const closeCaptureDialog = () => setCaptureDialogOpen(false);
  const fileInputRef = useRef(null);
  const dispatch = useDispatch();
  const partId = parseInt(useQuery().get('partId'), 10);

  const onUpload = () => {
    fileInputRef.current.click();
  };

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>): void {
    for (let i = 0; i < e.target.files.length; i++) {
      const formData = new FormData();
      formData.append('image', e.target.files[i]);
      dispatch(postImages(formData));
    }
  }

  const commandBarItems: ICommandBarItemProps[] = useMemo(
    () => [
      {
        key: 'uploadImages',
        text: 'Upload images',
        iconProps: {
          iconName: 'Upload',
        },
        onClick: onUpload,
      },
      {
        key: 'captureFromCamera',
        text: 'Capture from camera',
        iconProps: {
          iconName: 'Camera',
        },
        onClick: openCaptureDialog,
      },
    ],
    [],
  );

  useEffect(() => {
    dispatch(getImages());
    // For image list items
    dispatch(getParts());
  }, [dispatch]);

  return (
    <>
      <Stack styles={{ root: { height: '100%' } }}>
        <CommandBar
          items={commandBarItems}
          styles={{ root: { borderBottom: `solid 1px ${theme.palette.neutralLight}` } }}
        />
        <Stack styles={{ root: { padding: '15px' } }} grow>
          {labeledImages.length ? (
            <ImageList images={labeledImages} />
          ) : (
            <EmptyAddIcon
              title="Add images"
              subTitle="Capture images from your video streams and tag parts"
              primary={{ text: 'Capture from camera', onClick: openCaptureDialog }}
              secondary={{ text: 'Upload images', onClick: onUpload }}
            />
          )}
        </Stack>
      </Stack>
      <CaptureDialog isOpen={isCaptureDialgOpen} onDismiss={closeCaptureDialog} partId={partId} />
      <LabelingPage mode={LabelPageMode.MultiPage} />
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleUpload}
        accept="image/*"
        multiple
        style={{ display: 'none' }}
      />
    </>
  );
};
